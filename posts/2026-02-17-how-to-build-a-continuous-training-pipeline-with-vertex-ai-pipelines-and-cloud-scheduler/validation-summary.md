# Validation Summary: How to Build a Continuous Training Pipeline with Vertex AI Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vertex AI Pipelines
- Kubeflow Pipelines SDK
- Vertex AI Model Registry and endpoints
- Cloud Functions / Cloud Run functions
- Cloud Scheduler
- BigQuery
- Pub/Sub
- XGBoost
- Python
- gcloud CLI

## Sources Consulted
- Google Cloud Vertex AI Pipelines: Build a pipeline: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Google Cloud Vertex AI Pipelines: Run a pipeline: https://cloud.google.com/vertex-ai/docs/pipelines/run-pipeline
- Kubeflow Pipelines control flow documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- Vertex AI prebuilt containers for inference: https://cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI export model artifacts for inference: https://cloud.google.com/vertex-ai/docs/training/exporting-model-artifacts
- Vertex AI SDK for Python Model reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- gcloud scheduler jobs create http reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP target authentication: https://cloud.google.com/scheduler/docs/http-target-auth
- Cloud Run functions authentication: https://cloud.google.com/functions/docs/securing/authenticating

## Issues Found
- The post used older `kfp.v2` imports and `dsl.Condition`. Updated the snippets to use current KFP v2 import style (`from kfp import dsl, compiler`) and `dsl.If` / `dsl.Else`, matching current Vertex AI and Kubeflow guidance.
- The XGBoost model was saved with `joblib.dump(model, model_artifact.path)`, which would not create the required prebuilt-container artifact file. Updated the training component to save `model.bst` under the model artifact directory and updated evaluation to load that file.
- The model registration step used an outdated scikit-learn prediction container for an XGBoost model. Updated it to the supported Vertex AI XGBoost 2.1 prebuilt prediction container and pinned the training/evaluation XGBoost dependency to the matching major/minor version range.
- The architecture and notification section described failure notifications, but the assembled pipeline did not invoke the notification component on failed evaluation. Added a `dsl.Else()` branch that sends the failure notification.
- Several standalone component snippets omitted required KFP imports. Added the missing imports so each code example is syntactically complete.
- The pipeline compilation and Cloud Function template path referred to a JSON artifact while current Vertex AI examples compile KFP v2 pipelines to YAML. Updated both references to `continuous_training_pipeline.yaml`.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI flags were checked against the official Google Cloud CLI reference instead of local `--help` output. Python code blocks were parsed with `python3` for syntax after editing. The post remains a simplified tutorial; a production implementation should also show the Cloud Function `requirements.txt`, IAM role bindings, endpoint creation, and monitoring setup.
