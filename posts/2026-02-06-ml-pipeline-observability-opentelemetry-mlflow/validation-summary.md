# Validation Summary: How to Set Up ML Pipeline Observability with OpenTelemetry and MLflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP exporters
- MLflow Tracking
- MLflow Model Registry
- scikit-learn
- pandas
- NumPy

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- MLflow Python API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.html
- MLflow sklearn flavor API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- scikit-learn GradientBoostingClassifier documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html
- scikit-learn classification metrics documentation: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_score.html
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The setup code used `mlflow.sklearn.log_model()` later in the post but only imported `mlflow`. Added `import mlflow.sklearn` so the sklearn flavor used by the example is explicit.
- The preprocessing code skipped label encoding for `target_column`. For a customer churn dataset, the target is commonly categorical, and scikit-learn binary metrics default to `pos_label=1`. Updated categorical encoding to include the target column so the training and evaluation examples consistently use numeric labels.
- The MLflow model logging example used `artifact_path="model"`. Current MLflow documentation marks `artifact_path` as deprecated for `mlflow.sklearn.log_model()` and recommends `name` instead. Updated the call to `name="model"`.

## Review Notes
The Python snippets were checked for syntax with `ast`. A full runtime execution was not possible in this environment because the required MLflow, OpenTelemetry, pandas, and scikit-learn packages were not installed, and creating a temporary virtual environment failed because `python3-venv` is unavailable. A temporary direct package install was also blocked by lack of disk space. The OpenTelemetry and MLflow API usage was therefore validated against official documentation.
