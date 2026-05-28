# Validation Summary: How to Implement Model Ensembles on Vertex AI Prediction Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI Prediction Endpoints
- Vertex AI custom prediction containers
- Vertex AI SDK for Python
- Python
- Flask
- Google Cloud Storage client library
- XGBoost
- scikit-learn
- PyTorch / TorchScript
- Model ensembling and stacking

## Sources Consulted
- Vertex AI custom container requirements: https://cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Vertex AI custom containers for inference: https://cloud.google.com/vertex-ai/docs/predictions/use-custom-container
- Vertex AI online prediction input format: https://cloud.google.com/vertex-ai/docs/predictions/get-online-predictions
- Vertex AI SDK for Python `Model.upload` / `Model.deploy`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI SDK for Python `Endpoint.predict`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- scikit-learn `cross_val_predict`: https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.cross_val_predict.html
- scikit-learn `StackingClassifier`: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.StackingClassifier.html
- XGBoost Python API: https://xgboost.readthedocs.io/en/stable/python/python_api.html
- PyTorch `torch.jit.load`: https://docs.pytorch.org/docs/stable/generated/torch.jit.load.html
- PyTorch `torch.no_grad`: https://docs.pytorch.org/docs/stable/generated/torch.no_grad.html

## Issues Found
- The introduction claimed an ensemble prediction is "almost always better" than any individual model. This was too strong technically, because ensembles help when base models have useful diversity and can still underperform. Changed it to say ensembles can often be better when models make different errors.
- The initial Vertex AI implementation list mentioned a routing layer, but the post's third implementation is stacking. Updated the sentence to match the actual approaches covered.
- The explanation that model errors "tend to cancel out" was oversimplified. Clarified that averaging can reduce variance and improve robustness when errors are not strongly correlated.
- The custom container helper was named and written only for GCS, while the code defaulted to a local `/models` path when `AIP_STORAGE_URI` is unavailable. Replaced it with a helper that supports both GCS URIs and local paths.
- The TorchScript load example did not specify `map_location`, which can fail if a model saved on GPU is loaded on a CPU-only serving container. Added `map_location="cpu"`.
- The multi-endpoint ensemble client claimed to handle different prediction formats but only handled scalar and list-like predictions. Added explicit extraction for common dictionary prediction formats.
- The stacking server snippet defined `load_models()` but never called it or started the Flask app. Added a health route and `if __name__ == "__main__"` startup block using `AIP_HTTP_PORT`, matching Vertex AI custom container expectations.
- The stacking training snippet used `np.column_stack` without importing NumPy. Added `import numpy as np`.

## Review Notes
The Vertex AI SDK methods and parameter names used in the deployment and prediction examples are current according to the official Python SDK documentation. The examples remain illustrative and assume binary classification outputs; multiclass classification or heterogeneous endpoint response schemas would need task-specific score extraction and calibration.
