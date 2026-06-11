# Validation Summary: How to Create Model Approval Workflows

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- MLflow Model Registry
- MLflow Tracking Server
- Amazon SageMaker Model Registry
- AWS SDK for Python (Boto3)
- Amazon DynamoDB
- Python dataclasses, enums, JSON, and hashing
- Mermaid workflow diagrams

## Sources Consulted
- MLflow Model Registry workflow documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow Python client API reference: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- MLflow backend store and tracking server documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow remote tracking server tutorial: https://mlflow.org/docs/latest/ml/tracking/tutorials/remote-server/
- Amazon SageMaker CreateModelPackage API reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateModelPackage.html
- Amazon SageMaker model approval documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-approve.html
- Boto3 SageMaker update_model_package documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/update_model_package.html
- Boto3 DynamoDB Table.query documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html

## Issues Found
- The MLflow setup command set `MLFLOW_TRACKING_URI` directly to a PostgreSQL URI while describing a tracking server setup. Updated it to start `mlflow server` with `--backend-store-uri` for PostgreSQL metadata and then point clients at `http://localhost:5000`, matching MLflow tracking server documentation.
- The dependency installation command omitted `numpy`, but the automated validation example imports and uses `numpy`. Added `numpy` to the `pip install` command.
- Several MLflow examples used `MlflowClient.get_model_version_tag`, which is not part of the current MLflow Python client API. Replaced those reads with `get_model_version(...).tags.get(...)`.
- The sign-off example used `transition_model_version_stage`, which MLflow documents as deprecated since 2.9.0. Replaced it with `set_registered_model_alias(..., alias="champion", ...)` and adjusted the surrounding text to describe assigning a production alias instead of transitioning to the Production stage.

## Review Notes
- All Python code blocks were syntax-checked with `ast.parse`.
- The audit logger assumes a DynamoDB key schema compatible with querying by `model_name` and optionally `model_version`; the post presents this as an implementation sketch and does not include table creation.
- The SageMaker examples use current model package approval statuses: `Approved`, `Rejected`, and `PendingManualApproval`.
