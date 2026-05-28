# Validation Summary: How to Build a Video Content Analysis Pipeline with Vertex AI Video Intelligence

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Video Intelligence API
- Vertex AI Gemini multimodal video understanding
- Google Gen AI SDK for Python
- Cloud Storage
- Cloud Functions
- BigQuery
- Google Cloud CLI, gsutil, and bq CLI
- Python
- SQL

## Sources Consulted
- Google Cloud Video Intelligence speech transcription documentation: https://docs.cloud.google.com/video-intelligence/docs/feature-speech-transcription
- Google Cloud Video Intelligence Python API reference for SpeechTranscriptionConfig: https://docs.cloud.google.com/python/docs/reference/videointelligence/latest/google.cloud.videointelligence_v1.types.SpeechTranscriptionConfig
- Google Cloud Video Intelligence Python API reference for VideoAnnotationResults and VideoSegment: https://cloud.google.com/python/docs/reference/videointelligence/latest/google.cloud.videointelligence_v1.types.VideoAnnotationResults
- Vertex AI Gemini video understanding documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/video-understanding
- Vertex AI Gemini model lifecycle documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI Generative AI SDK deprecations and migration guidance: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Vertex AI content generation parameters for the Google Gen AI SDK: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
- BigQuery table schema and bq mk documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- Cloud Run functions deployment documentation: https://docs.cloud.google.com/functions/docs/deploy
- Cloud Run functions runtime support documentation: https://docs.cloud.google.com/functions/docs/runtime-support

## Issues Found
- The setup commands claimed to enable all required APIs but omitted APIs needed by the tutorial workflow. Added Cloud Functions, Cloud Build, and BigQuery API enablement commands.
- The BigQuery table schema omitted the `transcript` column even though the pipeline inserts `transcript` and the SQL query searches it. Added `transcript:STRING` to the schema.
- The Video Intelligence code waited up to 600 seconds while the deployment command sets a 540-second Cloud Function timeout. Reduced the API wait timeout to 520 seconds so it fits within the configured function timeout.
- The pipeline stored `duration_seconds` from `vi_results.get("duration", 0)` but `parse_vi_results` never returned a duration. Added duration extraction from `annotations.segment.end_time_offset`.
- The Gemini snippet used `vertexai.generative_models`, which is deprecated and scheduled for removal on June 24, 2026. Replaced it with the current Google Gen AI SDK.
- The Gemini snippet used `gemini-1.5-pro`, whose stable versions are retired according to the Vertex AI model lifecycle documentation. Updated the example to use `gemini-2.5-flash`, a current model that supports video understanding.
- The main pipeline comment said the analyses run in parallel, but the code ran them sequentially. Added a `ThreadPoolExecutor` so the implementation matches the explanation.

## Review Notes
The post is technically valid after the fixes. For production use, the synchronous Cloud Function design can still hit timeout limits for long videos; the post already notes Cloud Tasks or Workflows as the more reliable production pattern.
