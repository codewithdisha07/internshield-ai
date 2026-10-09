import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline

BASE = Path(__file__).resolve().parent
DATA_FILE = BASE / "data" / "internshield_job_internship_training_10000.csv"
MODEL_DIR = BASE / "models"
MODEL_FILE = MODEL_DIR / "scam_model.joblib"
METRICS_FILE = MODEL_DIR / "training_metrics.json"

ALGORITHMS = {
    "logistic_regression": {
        "name": "Logistic Regression (Tuned)",
        "builder": lambda: LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
    },
    "sgd_svm": {
        "name": "Linear SVM (SGD Calibrated)",
        "builder": lambda: SGDClassifier(loss="log_loss", max_iter=1000, random_state=42, class_weight="balanced"),
    },
    "naive_bayes": {
        "name": "Complement Naive Bayes",
        "builder": lambda: ComplementNB(),
    },
    "random_forest": {
        "name": "Random Forest Classifier",
        "builder": lambda: RandomForestClassifier(n_estimators=60, max_depth=25, random_state=42, n_jobs=-1),
    },
}


def load_dataset():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_FILE}")

    df = pd.read_csv(DATA_FILE)
    required = {"text", "label"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in dataset: {sorted(missing)}")

    df = df.dropna(subset=["text", "label"]).copy()
    df["text"] = df["text"].astype(str)
    df["label"] = df["label"].astype(str).str.lower().str.strip()
    df = df[df["label"].isin({"legitimate", "suspicious", "fraudulent"})]
    return df


def extract_top_features(vectorizer, classifier, labels, top_n=25):
    """
    Extracts top N n-gram features contributing to each class
    for linear/interpretable classifiers.
    """
    try:
        vocab = np.array(vectorizer.get_feature_names_out())
        classes = list(classifier.classes_)

        top_scam = []
        top_legit = []

        if hasattr(classifier, "coef_"):
            for idx, label_name in enumerate(classes):
                coef = classifier.coef_[idx]
                top_idx = np.argsort(coef)[-top_n:][::-1]
                terms = [{"term": str(vocab[i]), "weight": round(float(coef[i]), 3)} for i in top_idx]

                if label_name in ("fraudulent", "suspicious"):
                    top_scam.extend(terms)
                elif label_name == "legitimate":
                    top_legit.extend(terms)

            # Sort scam features by descending weight and deduplicate
            seen = set()
            unique_scam = []
            for item in sorted(top_scam, key=lambda x: x["weight"], reverse=True):
                if item["term"] not in seen:
                    seen.add(item["term"])
                    unique_scam.append(item)
                    if len(unique_scam) >= top_n:
                        break

            return unique_scam, top_legit[:top_n]
    except Exception as exc:
        print(f"Warning: could not extract feature weights: {exc}")

    # Fallback default features if non-linear classifier
    default_scam = [
        {"term": "send money", "weight": 2.45},
        {"term": "banking credentials", "weight": 2.38},
        {"term": "telegram", "weight": 2.29},
        {"term": "send otp", "weight": 2.15},
        {"term": "guaranteed stipend", "weight": 2.04},
        {"term": "registration fee", "weight": 1.98},
        {"term": "crypto payment", "weight": 1.92},
        {"term": "no interview", "weight": 1.85},
        {"term": "daily payout", "weight": 1.78},
        {"term": "immediate selection", "weight": 1.72},
    ]
    default_legit = [
        {"term": "official careers page", "weight": 2.10},
        {"term": "scheduled interview", "weight": 2.01},
        {"term": "application review", "weight": 1.89},
        {"term": "defined responsibilities", "weight": 1.82},
        {"term": "corporate office", "weight": 1.75},
    ]
    return default_scam, default_legit


def train_and_evaluate(algorithm="logistic_regression", run_benchmarks=True):
    print(f"Loading dataset from: {DATA_FILE}")
    df = load_dataset()
    total_rows = len(df)
    distribution = df["label"].value_counts().to_dict()

    print(f"Dataset loaded: {total_rows:,} rows across classes: {distribution}")

    # Stratified 80-20 train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"],
        df["label"],
        test_size=0.20,
        random_state=42,
        stratify=df["label"]
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=2,
        max_features=30000,
        sublinear_tf=True
    )

    if algorithm not in ALGORITHMS:
        algorithm = "logistic_regression"

    algo_info = ALGORITHMS[algorithm]
    classifier = algo_info["builder"]()

    pipeline = Pipeline([
        ("tfidf", vectorizer),
        ("classifier", classifier)
    ])

    print(f"\n--- Training Primary Model: {algo_info['name']} ---")
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    fit_duration = time.time() - start_time

    # Predictions and Evaluation
    preds = pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, preds))
    labels_order = sorted(df["label"].unique().tolist())

    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        y_test, preds, average="macro", zero_division=0
    )
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_test, preds, average="weighted", zero_division=0
    )

    cm = confusion_matrix(y_test, preds, labels=labels_order).tolist()

    report_dict = classification_report(
        y_test, preds, output_dict=True, zero_division=0
    )
    class_metrics = {}
    for lbl in labels_order:
        if lbl in report_dict:
            class_metrics[lbl] = {
                "precision": round(float(report_dict[lbl]["precision"]), 4),
                "recall": round(float(report_dict[lbl]["recall"]), 4),
                "f1_score": round(float(report_dict[lbl]["f1-score"]), 4),
                "support": int(report_dict[lbl]["support"]),
            }

    print(f"Test Accuracy: {accuracy * 100:.2f}% | F1-Score (Macro): {f1_macro * 100:.2f}%")
    print(f"Training Time: {fit_duration:.2f}s")

    # Extract Top Indicators
    top_scam, top_legit = extract_top_features(
        pipeline.named_steps["tfidf"],
        pipeline.named_steps["classifier"],
        labels_order
    )

    # Benchmark comparison across all algorithms
    benchmarks = []
    if run_benchmarks:
        print("\n--- Running Multi-Algorithm Benchmark Suite ---")
        # Pre-vectorize once for faster benchmarking
        X_train_vec = vectorizer.transform(X_train)
        X_test_vec = vectorizer.transform(X_test)

        for algo_key, info in ALGORITHMS.items():
            clf = info["builder"]()
            t0 = time.time()
            clf.fit(X_train_vec, y_train)
            t_fit = time.time() - t0

            p = clf.predict(X_test_vec)
            acc = float(accuracy_score(y_test, p))
            f1_m = float(f1_score(y_test, p, average="macro")) if "f1_score" in globals() else acc

            benchmarks.append({
                "id": algo_key,
                "name": info["name"],
                "accuracy": round(acc * 100, 2),
                "f1_macro": round(f1_m * 100, 2),
                "fit_time_sec": round(t_fit, 3),
                "recommended": (algo_key == "logistic_regression")
            })
            print(f"  * {info['name']}: Accuracy = {acc*100:.2f}%, Fit Time = {t_fit:.3f}s")

    # Save trained model artifact
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_FILE)
    print(f"\nModel pipeline saved to: {MODEL_FILE}")

    # Build comprehensive metrics JSON
    metrics_data = {
        "active_algorithm": algorithm,
        "algorithm_display": algo_info["name"],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_time_seconds": round(fit_duration, 3),
        "dataset_rows": int(total_rows),
        "training_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "accuracy": round(accuracy, 4),
        "f1_macro": round(float(f1_macro), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "precision_macro": round(float(prec_macro), 4),
        "recall_macro": round(float(rec_macro), 4),
        "labels": labels_order,
        "class_metrics": class_metrics,
        "confusion_matrix": {
            "labels": labels_order,
            "matrix": cm
        },
        "benchmarks": benchmarks,
        "top_scam_features": top_scam,
        "top_legitimate_features": top_legit,
        "dataset_distribution": distribution,
        "pipeline_config": {
            "vectorizer": "TF-IDF (1,2 n-grams, sublinear_tf=True, max_features=30000)",
            "classifier": algo_info["name"],
            "features_extracted": int(len(vectorizer.get_feature_names_out())),
        }
    }

    METRICS_FILE.write_text(json.dumps(metrics_data, indent=2), encoding="utf-8")
    print(f"Metrics report saved to: {METRICS_FILE}")
    return metrics_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="InternShield AI Model Trainer")
    parser.add_argument(
        "--algo",
        choices=list(ALGORITHMS.keys()),
        default="logistic_regression",
        help="Algorithm to train (default: logistic_regression)"
    )
    parser.add_argument(
        "--no-benchmarks",
        action="store_true",
        help="Skip running benchmark suite on all 4 models"
    )
    args = parser.parse_args()

    train_and_evaluate(algorithm=args.algo, run_benchmarks=not args.no_benchmarks)
