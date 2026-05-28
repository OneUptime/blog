# Validation Summary: How to Build a Multi-Language Translation Pipeline with Gemini

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Translation API Advanced
- Cloud Translation glossaries
- Vertex AI Gemini
- Google Gen AI SDK for Python
- Google Cloud CLI
- Cloud Run
- Cloud Scheduler
- Python

## Sources Consulted
- Cloud Translation glossary documentation: https://docs.cloud.google.com/translate/docs/advanced/glossary
- Cloud Translation batch text documentation: https://docs.cloud.google.com/translate/docs/advanced/batch-translation
- Cloud Translation document translation documentation: https://docs.cloud.google.com/translate/docs/advanced/translate-documents
- Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Vertex AI model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI content generation parameters: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
- Google Gen AI Python SDK reference: https://googleapis.github.io/python-genai/genai.html
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud scheduler jobs create http reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The Gemini examples used the deprecated `vertexai.generative_models` module. Updated the Python snippets to use the current Google Gen AI SDK with Vertex AI.
- The Gemini examples used `gemini-1.5-pro`, which is retired according to the Vertex AI model lifecycle documentation. Updated the examples to `gemini-2.5-pro`.
- The large-batch GCS example used `batch_translate_document` while describing batch text translation and then read `total_characters`, which is a batch text response field. Updated the example to use `batch_translate_text` with `InputConfig`, `OutputConfig`, and text MIME type.
- The quality-checking example used the old Gemini SDK and free-form JSON prompting. Updated it to use the Google Gen AI SDK and `response_mime_type="application/json"`.
- The Cloud Scheduler command used `--body`, which is not a valid flag for `gcloud scheduler jobs create http`. Replaced it with `--message-body`.

## Review Notes
The glossary setup, Cloud Translation glossary usage, Cloud Run deployment flags, and general Cloud Translation architecture are technically sound. The examples still assume the reader has created the Cloud Storage bucket, configured Application Default Credentials or equivalent service credentials, and granted the Cloud Run and Translation service accounts the necessary IAM permissions.
