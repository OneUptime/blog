# Validation Summary: How to Use Audio Transcription and Analysis with Gemini Multimodal on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini multimodal audio understanding
- Google Gen AI Python SDK
- Cloud Storage
- Cloud Run functions / Cloud Functions
- BigQuery
- gcloud CLI
- bq CLI
- Python

## Sources Consulted
- Google Cloud Vertex AI audio understanding documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/audio-understanding
- Google Cloud Vertex AI Generative AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/index.html
- Google Cloud Vertex AI structured output documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions runtime support documentation: https://docs.cloud.google.com/functions/docs/runtime-support
- BigQuery schema and `bq mk --table` documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- BigQuery table creation documentation: https://docs.cloud.google.com/bigquery/docs/tables

## Issues Found
- The post used the deprecated `vertexai.generative_models` module from the Vertex AI SDK. Updated the examples to use the current Google Gen AI Python SDK (`google-genai`) with `genai.Client(...)` and `types.Part.from_uri(...)`, because Google documents the Vertex AI SDK generative module as deprecated as of June 24, 2025 and scheduled for removal on June 24, 2026.
- The examples used `gemini-1.5-pro`, an older Gemini model line. Updated the examples to `gemini-2.5-pro`, which is listed in the current Vertex AI audio understanding documentation as supporting audio summarization, transcription, and translation.
- The transcription prompts requested timestamps but did not enable audio timestamp understanding. Added `audio_timestamp=True` to the relevant `GenerateContentConfig` calls, matching the Vertex AI audio documentation for audio-only timestamp use.
- Several snippets parsed JSON from model output without requesting JSON response mode. Added `response_mime_type="application/json"` to the JSON-producing calls to align the code with Vertex AI structured output guidance and make `json.loads(response.text)` more reliable.
- The support-call snippet used `json`, `GenerativeModel`, and `Part` without self-contained imports. Updated the snippet to include the required `json` and Google Gen AI SDK imports.
- The batch pipeline used `datetime.utcnow()` without importing `datetime`. Added `from datetime import datetime, timezone` and used `datetime.now(timezone.utc).isoformat()`.
- The deploy command omitted `--entry-point process_audio_upload`; without it, the hyphenated deployed function name `process-audio` would not match the Python function entry point. Added the explicit entry point flag.

## Review Notes
- The Python snippets were syntax-checked with `python3` after editing.
- The BigQuery `bq mk --table` inline schema syntax and Cloud Storage trigger deployment flags matched the official CLI documentation after the entry point fix.
