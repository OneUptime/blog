# Validation Summary: How to Register a Model in Vertex AI Model Registry and Manage Model Versions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Model Registry
- Vertex AI SDK for Python
- Google Cloud CLI
- Google Cloud Storage
- Artifact Registry
- TensorFlow, scikit-learn, and XGBoost serving containers

## Sources Consulted
- Vertex AI SDK for Python `Model` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Model versioning with Model Registry: https://docs.cloud.google.com/vertex-ai/docs/model-registry/versioning
- Vertex AI model version aliases: https://docs.cloud.google.com/vertex-ai/docs/model-registry/model-alias
- Vertex AI delete models and model versions: https://docs.cloud.google.com/vertex-ai/docs/model-registry/delete-model
- Vertex AI prebuilt containers for inference and explanation: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Google Cloud CLI `gcloud ai models` reference: https://docs.cloud.google.com/sdk/gcloud/reference/ai/models
- Google Cloud CLI `gcloud ai models delete-version` reference: https://cloud.google.com/sdk/gcloud/reference/ai/models/delete-version

## Issues Found
- Updated TensorFlow serving container examples from `tf2-cpu.2-14` to `tf2-cpu.2-15`, because TensorFlow 2.15 is the currently supported TensorFlow CPU prebuilt prediction image as of the review date.
- Updated scikit-learn serving container from `sklearn-cpu.1.3` to `sklearn-cpu.1-5`, because the documented image name uses a hyphen and the 1.3 image has passed its end-of-availability date.
- Updated XGBoost serving container from `xgboost-cpu.1-7` to `xgboost-cpu.2-1`, because the 1.7 image has passed its end-of-availability date.
- Replaced the alias-setting snippet that assigned `model.version_aliases` locally with the documented `ModelServiceClient.merge_version_aliases()` API call.
- Replaced `model.list_versions()` with the documented model version listing API.
- Corrected the gcloud command from `gcloud ai models list-versions` to `gcloud ai models list-version`.
- Replaced the Python model version deletion snippet with the documented `delete_model_version()` API call.
- Clarified that aliases are useful in deployment scripts and references, not that moving an alias automatically changes already deployed endpoint configurations.

## Review Notes
The local environment did not have `gcloud` or the `google-cloud-aiplatform` Python package installed, so command behavior and SDK APIs were verified against official Google Cloud documentation rather than local execution.
