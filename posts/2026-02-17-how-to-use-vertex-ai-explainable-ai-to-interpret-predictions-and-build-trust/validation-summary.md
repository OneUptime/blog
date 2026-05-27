# Validation Summary: How to Use Vertex AI Explainable AI to Interpret Predictions and Build Trust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex Explainable AI
- Vertex AI Python SDK
- AutoML tabular models
- Custom-trained Vertex AI models
- Sampled Shapley, Integrated Gradients, and XRAI feature attribution
- BigQuery
- Python

## Sources Consulted
- Google Cloud Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/docs/deprecations
- Google Cloud Vertex Explainable AI overview: https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/overview
- Google Cloud configure feature-based explanations: https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/configuring-explanations-feature-based
- Google Cloud get explanations: https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/getting-explanations
- Vertex AI Python SDK Model reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Python SDK Endpoint reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI Python SDK ExplanationParameters reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.ExplanationParameters
- Vertex AI Python SDK SampledShapleyAttribution reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.SampledShapleyAttribution
- Vertex AI Python SDK IntegratedGradientsAttribution reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.IntegratedGradientsAttribution
- Vertex AI Python SDK SmoothGradConfig reference: https://cloud.google.com/python/docs/reference/aiplatform/1.17.0/google.cloud.aiplatform_v1.types.SmoothGradConfig

## Issues Found
- Vertex Explainable AI is deprecated as of March 16, 2026 and scheduled for shutdown on March 16, 2027. Added a note near the top so readers understand this is for existing deployments or migrations, not new long-term architectures.
- The AutoML section incorrectly implied all AutoML models get explanations automatically and that deployment requires passing explanation metadata and parameters. Updated it to AutoML tabular classification/regression, which Google Cloud documents as automatically configured, and removed the unnecessary deployment parameters.
- The post described Sampled Shapley as working for any model type and Integrated Gradients as generally for deep learning models. Narrowed those claims to match Vertex AI compatibility: Sampled Shapley for custom models and AutoML tabular models, and Integrated Gradients for differentiable neural networks such as TensorFlow models served with TensorFlow prebuilt containers.
- The prediction explanation code assumed predictions are always scalar numbers. Added `get_prediction_value()` to handle common scalar, list, and dictionary response shapes before comparing against a threshold or logging.
- The BigQuery logging snippet used `datetime.utcnow()` without importing `datetime`. Added `datetime` and `timezone` imports and switched to `datetime.now(timezone.utc).isoformat()`.
- The attribution extraction loop used the final attribution object implicitly when recording baseline and instance output values. Updated it to explicitly use the first explained output, matching the common single-output case shown in the tutorial.

## Review Notes
The examples remain illustrative and still require users to align tensor names, output names, input baselines, and prediction response parsing with their actual model schema. Vertex Explainable AI APIs are still documented, but the deprecation and March 16, 2027 sunset date should be considered before using this in production.
