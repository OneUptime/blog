# Validation Summary: How to Master Machine Learning and Vertex AI Topics for the GCP Professional

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Vertex AI
- Vertex AI AutoML
- Vertex AI custom training jobs
- Vertex AI Model Registry, endpoints, and prediction
- Vertex AI Feature Store and Vertex AI Feature Store (Legacy)
- Vertex AI Pipelines
- BigQuery ML
- Google Cloud CLI (`gcloud ai`)
- Python (`google-cloud-aiplatform`, `google-cloud-bigquery`, `google-cloud-storage`, scikit-learn, joblib)
- Kubeflow Pipelines SDK and Google Cloud Pipeline Components

## Sources Consulted
- BigQuery ML `CREATE MODEL` statement: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create
- BigQuery ML logistic regression guide: https://cloud.google.com/bigquery/docs/logistic-regression-prediction
- Vertex AI tabular dataset creation: https://cloud.google.com/vertex-ai/docs/tabular-data/classification-regression/create-dataset
- Vertex AI deprecations: https://cloud.google.com/vertex-ai/docs/deprecations
- Vertex AI custom training code requirements: https://cloud.google.com/vertex-ai/docs/training/code-requirements
- `gcloud ai custom-jobs create` reference: https://cloud.google.com/sdk/gcloud/reference/ai/custom-jobs/create
- Vertex AI model import / `gcloud ai models upload`: https://cloud.google.com/vertex-ai/docs/model-registry/import-model
- `gcloud ai models upload` reference: https://cloud.google.com/sdk/gcloud/reference/ai/models/upload
- Vertex AI prebuilt prediction containers: https://cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- `gcloud ai endpoints create` reference: https://cloud.google.com/sdk/gcloud/reference/ai/endpoints/create
- `gcloud ai endpoints deploy-model` reference: https://cloud.google.com/sdk/gcloud/reference/ai/endpoints/deploy-model
- Vertex AI Feature Store overview: https://cloud.google.com/vertex-ai/docs/featurestore
- Vertex AI Feature Store (Legacy) overview: https://cloud.google.com/vertex-ai/docs/featurestore/overview
- Vertex AI Feature Store (Legacy) featurestore management: https://cloud.google.com/vertex-ai/docs/featurestore/managing-featurestores
- Vertex AI Pipelines build guide: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Google Cloud Pipeline Components AutoML components: https://cloud.google.com/vertex-ai/docs/pipelines/vertex-automl-component
- Vertex AI Model Monitoring overview: https://cloud.google.com/vertex-ai/docs/model-monitoring/overview

## Issues Found

1. **Outdated Vertex AI Data Labeling Service claim.** The post described Data Labeling Service as an available human labeling workforce. Official Vertex AI deprecation documentation says the service was shut down in 2024. Replaced this with console labeling and partner labeling solutions.

2. **Outdated AutoML Text and AutoML Video support.** The post listed text classification/extraction/sentiment and video classification/tracking as current AutoML support. Official deprecations show AutoML Text and AutoML Video are shut down. Updated the AutoML list to keep image and tabular support and point text/video readers to Gemini prompts and tuning.

3. **Unsupported tabular dataset CLI example.** The original `gcloud ai datasets import` example did not match current official dataset creation guidance. Replaced it with the documented Vertex AI Python SDK pattern using `aiplatform.TabularDataset.create(..., bq_source=...)`.

4. **Custom training artifact upload bug.** The Python training script claimed to save to GCS but used `joblib.dump()` directly against `gs://...`, which does not work without a filesystem adapter. Updated the script to save locally and upload with `google-cloud-storage` when `--model-dir` is a GCS URI, and added `--model-dir` to the custom job arguments.

5. **Unquoted BigQuery table reference.** The custom training script interpolated the table name directly into SQL. The example project ID contains a hyphen, so the table reference must be wrapped in backticks. Updated the query to ``SELECT * FROM `{args.training_data}```.

6. **Expired scikit-learn prediction container.** The model upload example used `us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-0:latest`, whose availability ended in 2024. Updated it to the currently listed `sklearn-cpu.1-5:latest` image.

7. **Feature Store legacy command context missing.** The post presented `gcloud ai featurestores ...` commands as current Vertex AI Feature Store usage. Those commands use the Vertex AI Feature Store (Legacy) resource hierarchy, which is deprecated and scheduled for shutdown on February 17, 2027. Added that caveat before the command block and adjusted nearby scenario language.

8. **Outdated Kubeflow Pipelines import.** The pipeline example used `from kfp.v2 import dsl, compiler`. Current KFP v2 documentation uses `from kfp import dsl, compiler` / `kfp.compiler.Compiler`. Updated the import.

9. **Overstated model monitoring wording.** The post said Vertex AI Model Monitoring detects data drift and concept drift. Official documentation describes feature skew and drift detection. Updated the key point accordingly.

## Review Notes
- BigQuery ML SQL options in the logistic regression example (`LOGISTIC_REG`, `input_label_cols`, `AUTO_SPLIT`, `l2_reg`, `max_iterations`, `ML.EVALUATE`, and `ML.PREDICT`) match the documented BigQuery ML syntax.
- The endpoint creation and deployment commands use documented `gcloud ai endpoints create` and `gcloud ai endpoints deploy-model` flags, including `--traffic-split=0=100` for sending all traffic to the newly deployed model.
- The Feature Store legacy commands are technically still relevant until the scheduled February 17, 2027 shutdown, but new implementations should prefer the current Vertex AI Feature Store resource model.
