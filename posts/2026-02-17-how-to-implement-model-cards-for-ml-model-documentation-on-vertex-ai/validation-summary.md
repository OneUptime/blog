# Validation Summary: How to Implement Model Cards for ML Model Documentation on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Model Registry
- Vertex AI Python SDK
- Google Cloud Storage Python client
- Python
- Model cards and responsible AI documentation
- OneUptime monitoring

## Sources Consulted
- Vertex AI Model Registry introduction: https://docs.cloud.google.com/vertex-ai/docs/model-registry/introduction
- Vertex AI model labels documentation: https://docs.cloud.google.com/vertex-ai/docs/model-registry/model-labels
- Vertex AI Python SDK `aiplatform.Model` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Cloud Storage Python `Blob.upload_from_string` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/summary_method
- "Model Cards for Model Reporting" paper: https://arxiv.org/abs/1810.03993

## Issues Found
- The post claimed that Vertex AI has built-in support for model cards. Current Vertex AI documentation describes Model Registry, labels, descriptions, versions, evaluations, and model artifacts, but not a dedicated model-card resource or API. Updated the wording to explain that model cards can be stored alongside model artifacts and referenced from Model Registry metadata.
- The Vertex AI example stored truncated model-card JSON in the model `description`. Updated it to store the full JSON in Cloud Storage and set the model description to a concise `gs://` pointer, with labels used only for searchable metadata.
- The timestamp examples used `datetime.utcnow()`, which returns a naive datetime and is deprecated in modern Python. Updated examples to use `datetime.now(timezone.utc).isoformat()`.
- The retraining update example overwrote `created_date` when refreshing metrics. Updated it to maintain `created_date` and set `updated_date` instead.
- The retraining snippet referenced `storage_client`, `json`, and `datetime` without showing imports or initialization. Added the missing imports and Cloud Storage client initialization.

## Review Notes
- All Python code fences compile syntactically with Python 3.
- The local environment does not have `google-cloud-aiplatform` or `google-cloud-storage` installed, so API behavior was verified against official Google Cloud documentation rather than local imports.
