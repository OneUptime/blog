# Validation Summary: How to Fix 'AI Platform' Training Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud AI Platform Training
- Google Cloud Vertex AI custom training
- Google Cloud IAM
- Cloud Storage
- Artifact Registry
- Google Cloud CLI
- Vertex AI SDK for Python
- TensorFlow and Keras
- Docker
- Cloud Logging and Cloud Monitoring
- Hyperparameter tuning with hypertune

## Sources Consulted
- Google Cloud Vertex AI / Agent Platform custom training documentation: https://cloud.google.com/vertex-ai/docs/training/create-custom-job
- Google Cloud Vertex AI / Agent Platform custom service account documentation: https://cloud.google.com/vertex-ai/docs/general/custom-service-account
- Google Cloud Vertex AI / Agent Platform prebuilt training containers: https://cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Google Cloud SDK reference for `gcloud ai custom-jobs`: https://cloud.google.com/sdk/gcloud/reference/ai/custom-jobs
- Google Cloud SDK reference for `gcloud ai custom-jobs stream-logs`: https://cloud.google.com/sdk/gcloud/reference/ai/custom-jobs/stream-logs
- Google Cloud SDK reference for `gcloud storage buckets add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud SDK reference for Artifact Registry IAM and Docker image commands: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/add-iam-policy-binding and https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud Artifact Registry Container Registry transition documentation: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Vertex AI SDK for Python `CustomJob` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- TensorFlow Keras `ModelCheckpoint` documentation: https://www.tensorflow.org/api_docs/python/tf/keras/callbacks/ModelCheckpoint
- Cloud Logging monitored resources reference: https://cloud.google.com/logging/docs/api/v2/resource-list

## Issues Found
- The permission example granted `roles/ml.admin` and `roles/aiplatform.user` to the training runtime service account. Changed it to grant job-submission roles to the caller identity and storage access to the Vertex AI custom training service agent.
- The custom service account example omitted the `iam.serviceAccounts.actAs` requirement for the submitter. Added a `roles/iam.serviceAccountUser` binding on the custom service account.
- Container examples used deprecated Container Registry commands and `gcr.io/$PROJECT_ID` push paths. Updated build, push, describe, and local run examples to use Artifact Registry.
- The Dockerfile used an outdated `gcr.io/deeplearning-platform-release/tf2-gpu.2-12` base image. Updated it to a documented Vertex AI prebuilt TensorFlow GPU training image URI.
- The quota section said a `gcloud compute regions describe` command could request a quota increase. Corrected the wording because the command only displays quota details.
- The checkpoint and hypertune Python snippets referenced TensorFlow without importing it. Added `import tensorflow as tf`.
- The monitoring snippet compared `CustomJob.state` to strings even though the Vertex AI SDK returns a `JobState` enum. Updated the comparisons to use `google.cloud.aiplatform_v1.types.job_state.JobState`.
- The monitoring snippet called `send_alert` without defining it. Added a minimal placeholder function so the example is self-contained.

## Review Notes
The post remains a broad troubleshooting guide rather than a complete runnable project. Some snippets still use placeholder functions and resources such as `build_model`, `train_dataset`, `val_dataset`, bucket names, project IDs, and notification integrations, which is appropriate for the guide format but should be replaced in real deployments.
