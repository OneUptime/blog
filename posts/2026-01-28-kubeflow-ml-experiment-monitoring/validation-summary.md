# Validation Summary: How to Monitor ML Experiments with Kubeflow

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubeflow Pipelines
- Kubeflow ML Metadata / ML Metadata
- Kubernetes Deployments and Services
- MLflow Tracking and Tracking Server
- Python
- scikit-learn
- Optuna
- pandas
- Plotly
- Slack incoming webhooks

## Sources Consulted
- Kubeflow Pipelines ML Metadata documentation: https://www.kubeflow.org/docs/components/pipelines/concepts/metadata/
- Kubeflow Pipelines artifacts documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/artifacts/
- Kubeflow Pipelines metrics visualization documentation: https://www.kubeflow.org/docs/components/pipelines/legacy-v1/sdk/output-viewer/
- Kubeflow Pipelines control flow documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- KFP SDK API reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.2.0/source/dsl.html
- MLflow CLI documentation for `mlflow server`: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow Python fluent API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.html
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow official Docker image documentation: https://mlflow.org/docs/latest/ml/docker/
- MLflow release information: https://github.com/mlflow/mlflow/releases
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- scikit-learn `RandomForestClassifier` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn `GradientBoostingClassifier` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html
- scikit-learn metrics documentation: https://scikit-learn.org/stable/modules/model_evaluation.html
- Optuna search space documentation: https://optuna.readthedocs.io/en/stable/tutorial/10_key_features/002_configurations.html
- pandas `read_parquet` documentation: https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html

## Issues Found
- The MLflow deployment used `ghcr.io/mlflow/mlflow:v2.8.0`, which is an old 2.x image while MLflow 3.x is the current release line. Updated the example to `ghcr.io/mlflow/mlflow:v3.13.0`.
- The `ExperimentTracker` example used `with tracker.start_run(...)`, but `start_run()` returned `self` and the class did not implement `__enter__` / `__exit__`. Added context manager methods that return the tracker and end the MLflow run on exit.
- The alert component accepted `metrics: Input[Metrics]` but read `F1_SCORE` and `ACCURACY` from environment variables, which KFP does not populate from the metrics artifact. Changed it to read `metrics.metadata["f1_score"]` and `metrics.metadata["accuracy"]`, matching the KFP `Metrics.log_metric()` artifact API.
- The pipeline used a normal Python `if slack_webhook:` around a pipeline input parameter. KFP pipeline functions define DAG topology, so conditional execution based on pipeline inputs should use `dsl.If`. Replaced it with `with dsl.If(slack_webhook != ""):`.

## Review Notes
- Python code blocks were parsed with `ast.parse` after edits and all Python snippets were syntactically valid.
- The Kubernetes YAML block was parsed successfully as multi-document YAML.
- The MLflow server example still assumes PostgreSQL, MinIO/S3 credentials, and the `mlflow-artifacts` bucket already exist; that is a deployment prerequisite rather than a code error.
