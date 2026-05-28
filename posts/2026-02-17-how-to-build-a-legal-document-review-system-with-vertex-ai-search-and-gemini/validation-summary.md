# Validation Summary: How to Build a Legal Document Review System with Vertex AI Search and Gemini

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Vertex AI Search / Discovery Engine
- Gemini on Vertex AI
- Google Gen AI SDK for Python
- Document AI
- Cloud Storage
- Cloud Run
- Flask
- Python

## Sources Consulted
- Google Cloud SDK `gcloud services enable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud Storage bucket creation documentation: https://docs.cloud.google.com/storage/docs/creating-buckets
- Google Cloud Storage `gcloud storage buckets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Vertex AI Gemini model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI Search create data store sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-data-store
- Vertex AI Search import documents from Cloud Storage sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-import-documents-gcs
- Vertex AI Search Python SearchServiceClient reference: https://cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.services.search_service.SearchServiceClient
- Vertex AI Search snippets and extracted content documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/snippets
- Vertex AI Search ExtractiveContentSpec Python reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.ContentSearchSpec.ExtractiveContentSpec
- Vertex AI Search SnippetSpec Python reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.ContentSearchSpec.SnippetSpec

## Issues Found
- The setup command enabled only `discoveryengine.googleapis.com`, but the code also uses Gemini on Vertex AI and the architecture references Document AI. Updated the command to enable `aiplatform.googleapis.com` and `documentai.googleapis.com` as well.
- The bucket creation command used `gsutil mb`. Google now recommends `gcloud storage` commands for Cloud Storage, so it was changed to `gcloud storage buckets create ... --location=us-central1`.
- The datastore creation sample accepted a `location` argument but did not configure the regional Discovery Engine endpoint for non-global locations. Added `ClientOptions` endpoint handling, matching the official Vertex AI Search samples.
- The ingestion sample called undefined helper functions for text extraction and datastore upload. Replaced the upload step with a concrete `DocumentServiceClient.import_documents` example that imports unstructured documents from Cloud Storage.
- The Gemini examples used the deprecated `vertexai.generative_models` module and the retired `gemini-1.5-pro` model. Updated them to the Google Gen AI SDK and `gemini-2.5-pro`.
- JSON parsing relied only on prompt instructions, which can produce non-JSON wrapper text. Added `response_mime_type="application/json"` to Gemini calls.
- The contract comparison code was shown as a standalone function but the Flask API called it as `analyzer.compare_contracts(...)`. Updated the snippet to show it as a `LegalAnalyzer` method.
- The search result parsing treated snippet entries as objects with a `.snippet` attribute. Vertex AI Search returns snippets in `derivedStructData.snippets` as structured entries containing a `snippet` key, so the code now uses `s.get("snippet", "")`.
- The `filters` argument in `search_legal_documents` was unused. Added it to the `SearchRequest.filter` field.

## Review Notes
The Python snippets were checked with `ast.parse` for syntax after editing. The local environment did not have `gcloud` or `gsutil` installed, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output.
