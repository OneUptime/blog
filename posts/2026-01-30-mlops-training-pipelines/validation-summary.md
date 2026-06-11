# Validation Summary: How to Create Model Training Pipelines

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Kubeflow Pipelines v2
- Kubernetes manifests and `kubectl`
- Python
- pandas and PyArrow
- scikit-learn
- XGBoost
- MLflow tracking and model registry
- Great Expectations
- Optuna
- GitHub Actions
- Prometheus client metrics

## Sources Consulted
- Kubeflow Pipelines lightweight component docs: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/lightweight-python-components/
- Kubeflow Pipelines parameter passing and `NamedTuple` outputs: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/parameters/
- Kubeflow Pipelines artifact docs: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/artifacts/
- Kubeflow Pipelines SDK 2.5.0 DSL reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.5.0/source/dsl.html
- Kubeflow Pipelines SDK 2.5.0 client reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.5.0/source/client.html
- MLflow 2.9.0 client API reference: https://mlflow.org/docs/2.9.0/python_api/mlflow.client.html
- MLflow model registry workflow and stage deprecation notes: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- Great Expectations 0.18 in-memory DataFrame validation guide: https://docs.greatexpectations.io/docs/0.18/oss/guides/validation/checkpoints/how_to_pass_an_in_memory_dataframe_to_a_checkpoint
- scikit-learn `OneHotEncoder` API reference: https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.OneHotEncoder.html
- pandas `read_parquet` API reference: https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html
- GitHub Actions workflow syntax: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/workflow-syntax
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The project structure omitted `components/model_registration.py` even though the post later defines and imports it. Added it to the tree.
- The ingestion component claimed S3/GCS support but installed `boto3`, which is not enough for pandas/fsspec cloud reads. Replaced it with `s3fs` and `gcsfs`.
- The basic validation component said it used Great Expectations but only performed manual pandas checks. Removed the unused Great Expectations dependency/imports and corrected the description.
- The feature transformer used `Output[dsl.Artifact]` without importing that type in the documented style. Changed it to `Output[Artifact]` and imported `Artifact`.
- The training and evaluation components returned dictionaries, then the pipeline attempted to access nested fields with `task.outputs["Output"]["run_id"]`. KFP v2 requires named output parameters for this pattern, so the examples now use `typing.NamedTuple` outputs and reference `task.outputs["run_id"]` / `task.outputs["deployment_approved"]`.
- The AUC examples assumed binary classification whenever `predict_proba` existed. Added a two-class guard before calling `roc_auc_score`.
- The MLflow examples used model registry stages and `transition_model_version_stage`, which are deprecated as of MLflow 2.9.0. Updated registration and promotion examples to use model aliases.
- The KFP recurring run example imported an unused API class and used a five-field cron expression. Removed the unused import and changed the cron expression to the six-field format documented by the KFP SDK.
- The GitHub Actions polling example passed `experiment_name` to `list_runs`, but KFP SDK 2.5.0 expects `experiment_id`. Updated the lookup and changed run status checks to use `run.state`.
- The Great Expectations advanced validation example loaded an expectation suite JSON but never applied it, and used unsupported/obsolete DataFrame helper APIs. Reworked it to follow the documented 0.18 in-memory DataFrame validator flow.
- The KFP caching best-practice snippet used a nonexistent `caching=True` argument on `@dsl.component`. Updated it to use `PipelineTask.set_caching_options`.
- Two abbreviated Python snippets used invalid `def fn(...):` syntax. Replaced those placeholders with syntactically valid minimal examples.
- The claim that KFP is "the most widely adopted" ML pipeline framework on Kubernetes was not verifiable from official documentation. Softened it to "widely used."

## Review Notes
The post is now technically consistent with the documented APIs checked above. I did not execute the full Kubeflow/MLflow pipeline because the local environment does not have the required ML/MLOps packages installed and no Kubernetes/KFP/MLflow services are available in this workspace. Static syntax validation was run against all fenced Python examples.
