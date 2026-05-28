# Validation Summary: How to Choose Between Custom Training and AutoML on Vertex AI for Your Use Case

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI AutoML
- Vertex AI custom training
- Vertex AI SDK for Python
- TensorFlow / Keras
- Vertex Explainable AI
- Vertex AI Model Monitoring
- OneUptime

## Sources Consulted
- Google Cloud Vertex AI training overview: https://docs.cloud.google.com/vertex-ai/docs/training-overview
- Google Cloud choose a training method: https://cloud.google.com/vertex-ai/docs/start/training-methods
- Google Cloud Vertex AI custom training overview: https://cloud.google.com/vertex-ai/docs/training/overview
- Vertex AI SDK for Python AutoMLTabularTrainingJob reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.AutoMLTabularTrainingJob
- Vertex AI SDK for Python CustomContainerTrainingJob reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomContainerTrainingJob
- Vertex AI SDK for Python Model.deploy reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI prebuilt containers for inference and explanation: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI tabular classification/regression data preparation: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/classification-regression/prepare-data
- Vertex AI tabular AutoML data best practices: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/bp-tabular
- Vertex AI image/object detection data preparation: https://docs.cloud.google.com/vertex-ai/docs/image-data/object-detection/prepare-data
- Vertex AI AutoML beginner's guide: https://docs.cloud.google.com/vertex-ai/docs/beginner/beginners-guide
- Vertex Explainable AI overview: https://docs.cloud.google.com/vertex-ai/docs/explainable-ai/overview
- Vertex AI Model Monitoring overview: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/overview
- Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/docs/deprecations

## Issues Found
- The post listed NER and implied AutoML Text/document classification were current AutoML choices. Vertex AI AutoML Text was deprecated on September 15, 2024 and shut down on June 15, 2025, so I updated the decision framework and document-classification example to avoid recommending new AutoML Text projects.
- The post described AutoML internals as neural architecture search over hundreds of configurations. Google documents Vertex AI NAS as a separate training capability and describes AutoML more generally as automating data preparation, model selection, and hyperparameter tuning, so I replaced the over-specific internals claim.
- The post said AutoML vision works with 100 images per class for all vision tasks. That is accurate for image classification examples, but object detection has separate annotation and bounding-box requirements, so I narrowed the statement.
- The post said AutoML automatically handles class imbalance. Google documentation still recommends careful data splitting for imbalanced classes, so I changed this to emphasize data quality, label balance, and splits.
- The custom training example used an older `gcr.io/cloud-aiplatform` serving container URI. I updated it to the current documented Artifact Registry URI, `us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-12:latest`.
- The cost section said AutoML costs are fixed by the budget. The SDK documentation says costs do not exceed the budget and can be noticeably smaller, so I changed "fixed" to "capped."
- The explainability section implied Vertex Explainable AI works out of the box with all AutoML models. I narrowed it to documented integrated support for AutoML tabular classification/regression and AutoML image classification.
- The monitoring section broadly recommended drift and prediction drift detection without caveats. I clarified that Vertex AI Model Monitoring should be used where it supports the model type, such as tabular drift, skew, and output inference drift monitoring.

## Review Notes
All Python code blocks parse successfully. The snippets use current Vertex AI SDK class names and method parameters, but they remain illustrative and require a configured Google Cloud project, valid data sources, IAM permissions, container images, model artifacts, and billing to run end to end.
