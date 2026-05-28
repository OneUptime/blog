# Validation Summary: How to Use AutoML Entity Extraction for Custom Named Entity Recognition

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI AutoML Text
- AutoML Entity Extraction
- Vertex AI SDK for Python
- Cloud Storage
- BigQuery
- Cloud Natural Language API

## Sources Consulted
- Google Cloud Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/docs/deprecations
- Vertex AI managed dataset formats: https://docs.cloud.google.com/vertex-ai/docs/training/using-managed-datasets
- Vertex AI SDK for Python `AutoMLTextTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.AutoMLTextTrainingJob
- Vertex AI SDK for Python `TextDataset` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.TextDataset
- Vertex AI `TextExtractionPredictionResult` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.v1.schema.predict.prediction_v1.types.TextExtractionPredictionResult
- Cloud Natural Language API entity analysis documentation: https://docs.cloud.google.com/natural-language/docs/analyzing-entities

## Issues Found
The tutorial is built around Vertex AI AutoML Text entity extraction training and serving, but Google Cloud's official deprecation page says AutoML Text was deprecated on September 15, 2024 and shut down on June 15, 2025. As of the validation date, the article's core workflow cannot be performed and should be removed or replaced with a new article about Gemini prompting/tuning or another supported entity extraction approach.

The training data JSONL example is also inconsistent with the official Vertex AI text entity extraction dataset schema. The official schema places `startOffset`, `endOffset`, and `displayName` directly inside each `textSegmentAnnotations` item, while the post nests offsets under `textSegment`.

The prediction parsing examples expect a `textSegmentAnnotations` list in each prediction result. The official `TextExtractionPredictionResult` schema returns parallel arrays such as `display_names`, `text_segment_start_offsets`, `text_segment_end_offsets`, and `confidences` in the Python proto representation.

The post recommends deploying the model for large-volume batch processing. Official Vertex AI guidance for batch prediction says batch predictions are requested from the model resource without deploying the model to an endpoint.

## Review Notes
No README changes were made because the post is not salvageable as a current AutoML Text tutorial. Correcting it would require replacing the subject and workflow with a supported product rather than making narrow technical fixes.
