# Validation Summary: How to Build an Intelligent Document Processing Pipeline with Document AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Document AI
- Vertex AI Gemini
- Cloud Storage
- Cloud Run functions / Cloud Functions Gen 2
- BigQuery
- Python
- gcloud CLI

## Sources Consulted
- Google Cloud Document AI processor creation docs: https://docs.cloud.google.com/document-ai/docs/create-processor
- Google Cloud Document AI Python Processor reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Processor
- Google Cloud Document AI online processing sample: https://cloud.google.com/document-ai/docs/samples/documentai-process-document
- Google Cloud Document AI batch processing sample: https://cloud.google.com/document-ai/docs/samples/documentai-batch-process-document
- Google Cloud Document AI limits: https://docs.cloud.google.com/document-ai/limits
- Vertex AI Python GenerativeModel reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.generative_models.GenerativeModel
- Vertex AI Gemini inference reference: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
- Vertex AI structured output docs: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
- Cloud Run functions deployment docs: https://cloud.google.com/functions/docs/deploy
- Cloud Run functions writing/dependency docs: https://cloud.google.com/functions/docs/writing
- Cloud Run functions Python dependency docs: https://cloud.google.com/functions/docs/writing/specifying-dependencies-python
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy

## Issues Found
- The architecture diagram labeled the classification step as Document AI, but the implementation uses Vertex AI Gemini for classification. Changed the diagram node to "Vertex AI - Classification".
- The API enablement command omitted supporting services commonly required for a Gen 2 Python function deployment and Cloud Storage event trigger. Added Cloud Build, Artifact Registry, Cloud Run, Eventarc, and Cloud Logging APIs.
- The package installation command omitted `functions-framework`, which the Python Cloud Run functions docs require or recommend explicitly for deployable Python function source. Added it to the install command.
- The Gemini examples parsed `response.text` as JSON while only prompting the model to return JSON. Added `response_mime_type: "application/json"` to the generation config so the examples use Vertex AI's JSON output mode.
- The large-document section incorrectly said Document AI batch processing handles documents up to 5,000 pages. The current limits page lists 5,000 files per batch request, with page limits set per processor. Updated the text with processor-specific examples for Enterprise Document OCR and Invoice Parser.

## Review Notes
The code examples are illustrative and still require real project IDs, processor IDs, a BigQuery dataset/table, IAM permissions, and a deployable `requirements.txt` in the function source directory. The Document AI snippets use the `us` location, which is consistent with the processor names shown; deployments using other locations should configure the regional Document AI API endpoint as shown in Google's samples.
