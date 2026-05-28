# Validation Summary: How to Build a Resume Screening and Ranking System with Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Document AI
- Vertex AI / Gemini API
- Google Gen AI Python SDK
- Python
- BigQuery
- Flask
- Cloud Run

## Sources Consulted
- Document AI client libraries: https://cloud.google.com/document-ai/docs/libraries
- Document AI supported file types: https://cloud.google.com/document-ai/docs/file-types
- Vertex AI Google Gen AI SDK content generation parameters: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
- Vertex AI SDK migration guide: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Gemini model versions and lifecycle: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
1. **Deprecated Vertex AI SDK module**: Replaced `vertexai.generative_models.GenerativeModel` usage with the Google Gen AI Python SDK (`google-genai`). Google documents the Vertex AI SDK generative AI module as deprecated and scheduled for removal after June 24, 2026.

2. **Retired Gemini model**: Replaced `gemini-1.5-pro` with `gemini-2.5-pro`, a supported Gemini model listed in the current model lifecycle documentation. The Gemini 1.5 Pro versioned models are retired.

3. **Missing structured JSON response configuration**: Added `response_mime_type="application/json"` to the Gemini calls using `GenerateContentConfig`, matching the current Vertex AI guidance for JSON output.

4. **Document AI processor location handling**: Updated the Document AI example to accept a processor `location`, configure the regional API endpoint, and build the processor resource name with `client.processor_path(...)` instead of hard-coding `locations/us`.

5. **Document AI file type wording**: Clarified that DOCX handling depends on a processor such as Layout Parser, matching Document AI's supported file type notes for OOXML files.

## Review Notes
- The Cloud Run deployment command uses valid `gcloud run deploy` flags, including `--source`, `--region`, `--memory`, `--timeout`, `--service-account`, and `--no-allow-unauthenticated`.
- The Flask and BigQuery snippets are syntactically valid as tutorial examples, but the batch pipeline still relies on application-specific helpers such as `get_job_description` and a pre-created BigQuery table.
- The Python code blocks were syntax-checked together with Python 3.
