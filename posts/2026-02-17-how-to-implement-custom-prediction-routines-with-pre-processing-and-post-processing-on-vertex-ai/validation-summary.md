# Validation Summary: How to Use Custom Prediction Routines with Pre-Processing and Post-Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Custom Prediction Routines
- Vertex AI SDK for Python
- Python
- TensorFlow Keras
- NumPy
- pandas
- Pillow
- scikit-learn-style prediction APIs
- Artifact Registry

## Sources Consulted
- Google Cloud Vertex AI custom inference routines documentation: https://cloud.google.com/vertex-ai/docs/predictions/custom-prediction-routines
- Google Cloud Python SDK reference for `google.cloud.aiplatform.prediction.Predictor`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.prediction.Predictor
- Google Cloud Python SDK reference for `google.cloud.aiplatform.prediction.LocalModel`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.prediction.LocalModel
- Google Cloud Python SDK reference for `google.cloud.aiplatform.Model`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud Python SDK `prediction_utils.download_model_artifacts` source: https://raw.githubusercontent.com/googleapis/python-aiplatform/main/google/cloud/aiplatform/utils/prediction_utils.py

## Issues Found
- The image predictor downloaded model artifacts but then loaded files from `artifacts_uri`, which can be a `gs://` URI. Changed the sample to load `saved_model` and `labels.json` from the local working directory after `prediction_utils.download_model_artifacts(artifacts_uri)` runs.
- The tabular predictor loaded artifacts directly from `artifacts_uri` and did not call `prediction_utils.download_model_artifacts`, which would fail for Cloud Storage model artifact URIs. Added artifact download/copy logic and changed file reads to local filenames.
- The deployment sample used an incorrect `LocalModel.build_cpr_model` call with a predictor file path and class name string. Updated it to pass the source directory, required Artifact Registry output image URI, and predictor class object.
- The deployment sample called `local_model.upload`, which is not the documented upload flow. Updated it to call `local_model.push_image()` and `aiplatform.Model.upload(local_model=local_model, ...)`.
- The deployment sample mixed explicit project/location arguments with an endpoint created without those settings. Added `aiplatform.init(project=..., location=...)` so subsequent SDK calls use the intended project and region.
- The error-handling snippet validated base64 with `base64.b64decode` in its default lenient mode and returned an undefined `self._process_images(instances)` helper. Updated it to use `validate=True` and include the preprocessing logic directly.

## Review Notes
The CPR interface explanation and request flow are consistent with the default `PredictionHandler`, which invokes `postprocess(predict(preprocess(prediction_input)))`. The samples are illustrative and still assume matching model artifacts, dependency versions, Artifact Registry repository setup, and a model that supports the selected GPU machine configuration.
