# Validation Summary: How to Export BigQuery ML Models to Vertex AI for Serving

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery ML
- Vertex AI Model Registry
- Vertex AI endpoints and online prediction
- Vertex AI Model Monitoring
- Vertex AI batch prediction
- Google Cloud CLI
- Vertex AI SDK for Python
- TensorFlow SavedModel
- XGBoost Booster model artifacts

## Sources Consulted
- BigQuery ML export models documentation: https://cloud.google.com/bigquery/docs/exporting-models
- BigQuery ML EXPORT MODEL statement reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-export-model
- Vertex AI prebuilt prediction containers: https://cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- gcloud ai endpoints deploy-model reference: https://cloud.google.com/sdk/gcloud/reference/ai/endpoints/deploy-model
- Vertex AI deploy model traffic split documentation: https://cloud.google.com/vertex-ai/docs/predictions/deploy-model-api
- Vertex AI SDK Model class reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI online predictions documentation: https://cloud.google.com/vertex-ai/docs/tabular-data/classification-regression/get-online-predictions
- Vertex AI Model Monitoring setup documentation: https://cloud.google.com/vertex-ai/docs/model-monitoring/set-up-model-monitoring
- Vertex AI batch prediction documentation: https://cloud.google.com/vertex-ai/docs/predictions/get-batch-predictions

## Issues Found
- The exportable BigQuery ML model list was incomplete and incorrectly said matrix factorization cannot be exported. Updated the list to include currently documented exportable model types and left ARIMA_PLUS as not exportable.
- The post implied all BigQuery ML exports are TensorFlow SavedModel artifacts that Vertex AI can serve directly. Clarified that TensorFlow SavedModel-compatible models fit the shown TensorFlow serving path, while boosted tree and random forest exports use XGBoost Booster artifacts and require a custom prediction routine. Also noted that exported AutoML Tables models do not support Vertex AI online deployment.
- The TensorFlow serving container guidance was too broad. Updated it to say users should choose a TensorFlow Serving version that can load the exported SavedModel.
- The traffic split explanation described `0` as a deployment index. Corrected it to the documented temporary ID for the new DeployedModel during deployment.
- The canary traffic split example used `0=90,1=10`, which incorrectly treats both deployments as temporary indexes. Updated it to use `OLD_DEPLOYED_MODEL_ID=90,0=10`.
- The model monitoring Python snippet used invalid current SDK parameters for `ModelDeploymentMonitoringJob.create`. Replaced it with the current Model Monitoring v2 preview SDK pattern for creating a model monitor with schema and drift objectives, and added the endpoint request-response logging caveat.

## Review Notes
- Python snippets were syntax-checked with `python3 ast.parse`.
- The local environment does not have `gcloud`, `bq`, or `gsutil` installed, so CLI validation was performed against official Google Cloud CLI documentation instead of local `--help` output.
- Google Cloud documentation now notes that Vertex AI documentation is moving under Gemini Enterprise Agent Platform; the referenced Vertex AI pages remain the authoritative product documentation for the commands and SDK APIs reviewed here.
