# Validation Summary: How to Implement Continuous Training Pipelines

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- MLOps and continuous training pipelines
- Data drift detection with PSI and Kolmogorov-Smirnov tests
- Prefect
- Great Expectations / GX Core
- MLflow Model Registry
- scikit-learn metrics
- SciPy statistical tests
- Prometheus Python client
- SQLite

## Sources Consulted
- Prefect deployments documentation: https://docs.prefect.io/v3/concepts/deployments
- Prefect schedule creation documentation: https://docs.prefect.io/v3/how-to-guides/deployments/create-schedules
- Prefect local process serving documentation: https://docs.prefect.io/v3/how-to-guides/deployment_infra/run-flows-in-local-processes
- Prefect migration guidance for Deployment.build_from_flow: https://docs.prefect.io/v3/how-to-guides/migrate/upgrade-agents-to-workers
- Great Expectations dataframe validation documentation: https://docs.greatexpectations.io/docs/core/introduction/try_gx/
- Great Expectations dataframe data connection documentation: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Python client API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- MLflow scikit-learn API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow 3 migration guide: https://mlflow.org/docs/latest/ml/mlflow-3/
- SciPy ks_2samp documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
- SciPy chi2 documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html
- scikit-learn classification metrics documentation: https://scikit-learn.org/stable/modules/model_evaluation.html
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The performance trigger used `Dict` in type annotations without importing it. Updated the import from unused `Optional` to `Dict`.
- The performance trigger skipped zero-valued metric aggregates because it used `if result:`. Changed it to `if result is not None:` so valid zero values are retained.
- The drift trigger could divide by zero when no reference features matched the current data. Added an empty-result guard.
- The PSI histogram ignored values outside the reference mean +/- three standard deviations. Added open-ended bins so out-of-range current values are counted.
- The Great Expectations example used `ge.read_parquet()` and dataframe-style `expect_*` methods that are not the current GX Core dataframe validation pattern. Replaced it with `pandas.read_parquet()`, a GX Data Context, Data Source, Data Asset, Batch Definition, and `batch.validate(...)`.
- The Prefect deployment example used `Deployment.build_from_flow`, `Deployment.apply`, and an internal `CronSchedule` import. Updated it to the documented Prefect 3 `to_deployment(...)` and `serve(...)` pattern with `cron=...`.
- The MLflow registry example used deprecated model stages through `get_latest_versions(..., stages=["Production"])` and `transition_model_version_stage(...)`. Updated it to use registered model aliases with `get_model_version_by_alias(...)` and `set_registered_model_alias(...)`.
- The MLflow model logging example passed `sk_model=None`, which would fail at runtime. Added an explicit placeholder guard requiring a fitted sklearn model before logging.
- The MLflow model logging example used deprecated `artifact_path` and reconstructed a `runs:/.../model` URI. Updated it to use `name="model"` and pass the returned `model_info.model_uri` through evaluation and registration.

## Review Notes
The snippets are still illustrative: data warehouse reads, feature computation, actual model training, and evaluation-set prediction logic are intentionally omitted or represented as placeholders. The Python code blocks were checked with `ast.parse` for syntax correctness after the fixes.
