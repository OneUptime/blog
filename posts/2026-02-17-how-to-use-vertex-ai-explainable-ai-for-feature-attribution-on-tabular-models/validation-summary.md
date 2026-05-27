# Validation Summary: How to Use Vertex AI Explainable AI for Feature Attribution on Tabular Models

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex Explainable AI
- Vertex AI SDK for Python (`google-cloud-aiplatform`)
- Sampled Shapley attribution
- Integrated Gradients attribution
- Batch prediction and batch explanations
- Python

## Sources Consulted
- Google Cloud Vertex AI documentation: Configure feature-based explanations - https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/configuring-explanations-feature-based
- Google Cloud Vertex AI documentation: Get explanations - https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/getting-explanations
- Google Cloud Vertex AI documentation: Introduction to Vertex Explainable AI - https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/overview
- Google Cloud Vertex AI documentation: Use TensorFlow for explanations - https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/tensorflow
- Google Cloud Vertex AI documentation: Get batch inferences from a custom trained model - https://docs.cloud.google.com/vertex-ai/docs/predictions/get-batch-predictions
- Google Cloud Python SDK reference: `google.cloud.aiplatform.Model` - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud Python SDK reference: `google.cloud.aiplatform.Endpoint` - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Google Cloud Python SDK reference: `google.cloud.aiplatform.BatchPredictionJob` - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.BatchPredictionJob
- Local SDK check with `google-cloud-aiplatform` 1.153.1 installed into `/tmp/aiplatform-check`

## Issues Found
- Vertex Explainable AI is deprecated as of March 16, 2026, with access ending on or after March 16, 2027. Added a note near the introduction so the tutorial is current for readers.
- The post said every prediction can include explanations "at no extra training cost." Updated this to say explanation requests can include feature attributions without retraining, which is more precise because online predictions use `explain` requests and explanations still add inference cost.
- The post described default baselines as typically mean or median training values. Updated this to explain that baselines are configured or Vertex-selected defaults, such as zero-valued baselines for many tabular custom models.
- The Integrated Gradients section mentioned TensorFlow or PyTorch. Updated it to TensorFlow models served with Vertex AI prebuilt TensorFlow containers, which matches the supported compatibility documented by Google Cloud.
- The practical considerations claimed 25 Sampled Shapley paths make requests roughly 25 times slower than plain prediction. Reworded this to the documented behavior: higher path counts are more computationally intensive and explanations can be much slower than prediction.

## Review Notes
The Python SDK examples use current `google-cloud-aiplatform` APIs for `Model.upload`, `Endpoint.explain`, `Model.batch_predict`, `ExplanationMetadata`, `ExplanationParameters`, `SampledShapleyAttribution`, `IntegratedGradientsAttribution`, and `SmoothGradConfig`. The examples remain illustrative because actual tensor names, serving container image versions, instance shape, and output names must match the uploaded model.
