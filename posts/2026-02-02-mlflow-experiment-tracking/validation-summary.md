# Validation Summary: How to Track ML Experiments with MLflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow (experiment tracking, autologging, model logging, search API, nested runs, remote tracking server)
- Python
- scikit-learn (RandomForestClassifier, GradientBoostingClassifier, LogisticRegression, GridSearchCV, KFold, datasets)
- PyTorch (nn.Module, DataLoader, TensorDataset, optim.Adam, CrossEntropyLoss)
- NumPy
- matplotlib
- SQLite / PostgreSQL (as MLflow tracking backends)
- Amazon S3 (as MLflow artifact store)

## Sources Consulted
- MLflow `pyproject.toml` on GitHub (to verify available `pip` extras): https://github.com/mlflow/mlflow/blob/master/pyproject.toml
- MLflow autologging documentation: https://mlflow.org/docs/latest/ml/tracking/autolog
- General MLflow Python API knowledge: `mlflow.start_run`, `mlflow.log_param`, `mlflow.log_metric`, `mlflow.log_artifact(s)`, `mlflow.set_tag`, `mlflow.search_runs`, `mlflow.sklearn.log_model`, `mlflow.pytorch.log_model`, `mlflow.models.infer_signature`, `MlflowClient`
- scikit-learn API (`RandomForestClassifier`, `GridSearchCV`, `KFold`, `train_test_split`)
- PyTorch API (`nn.Linear`, `nn.ReLU`, `DataLoader`, `random_split`, `optim.Adam`)

## Issues Found

1. **Invalid `pip install` extras for MLflow framework integrations.** The post recommended `pip install mlflow[sklearn]`, `pip install mlflow[pytorch]`, and `pip install mlflow[tensorflow]`. MLflow's `pyproject.toml` does not define `sklearn`, `pytorch`, or `tensorflow` as optional extras (only `extras`, `databricks`, `gateway`, `genai`, `mcp`, `azure`, `sqlserver`, `aliyun-oss`, `jfrog`, `kubernetes`, `langchain`, `auth`, and `db` are defined). Running those commands would silently install MLflow without the framework — `pip` warns but ignores unknown extras. Fixed by changing the snippets to install the framework packages alongside MLflow directly: `pip install mlflow scikit-learn`, `pip install mlflow torch`, `pip install mlflow tensorflow`.

2. **Autologging table listed "Spark MLlib" as fully supported.** The official MLflow autologging documentation explicitly states that autologging of Spark ML (MLlib) models is not (yet) supported for the JVM-side MLlib. The supported entry point is `mlflow.pyspark.ml.autolog()` for PySpark ML estimators. Renamed the row to **PySpark ML** to accurately reflect what MLflow autologging actually targets.

## Review Notes

- The `mlflow.sklearn.log_model(model, "random_forest_model", ...)` and `mlflow.pytorch.log_model(model, "pytorch_model")` calls use the positional `artifact_path` argument. In MLflow 3.0+ this parameter was renamed to `name`, but the positional form still works for backward compatibility. No change required.
- In the tagging example, `mlflow.set_tag("mlflow.runName", f"{model_name}_{phase}")` is redundant because the same value is already passed via `run_name=` to `mlflow.start_run`. Harmless but unnecessary — left intact to preserve the author's voice.
- The neural-network "training" example in *Logging Metrics Over Time* is intentionally simulated (computed from a deterministic decay plus noise rather than a real model). The text already labels it as simulated, so no change needed.
- The artifact-logging example writes files to the current working directory and then deletes them after `log_artifact` uploads them. This is fine but means the script must have write access to CWD. The use of `mlflow.log_artifacts("data_samples", artifact_path="data_samples")` is correct: the second arg is the destination subdirectory under the run's artifact root.
- The `mlflow.search_runs(experiment_names=[...])` call is valid (supported in MLflow 2.x+).
- The PyTorch example is technically correct; in newer MLflow versions one could also pass `input_example=` to `mlflow.pytorch.log_model` to attach a signature, but its omission isn't an error.
- "Related Reading" links all point to `https://oneuptime.com/blog` placeholders — this matches the style of other posts in the blog and is not a technical correctness issue.
