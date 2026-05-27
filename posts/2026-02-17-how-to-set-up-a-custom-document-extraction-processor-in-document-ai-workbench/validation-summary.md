# Validation Summary: How to Set Up a Custom Document Extraction Processor in Document AI Workbench

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Document AI
- Document AI Workbench
- Custom extraction processors
- Google Cloud Storage
- Google Cloud CLI
- Python client libraries for Document AI

## Sources Consulted
- Google Cloud Document AI: Creating and managing processors: https://docs.cloud.google.com/document-ai/docs/create-processor
- Google Cloud Document AI: Custom-based extraction: https://docs.cloud.google.com/document-ai/docs/custom-based-extraction
- Google Cloud Document AI: Create dataset: https://docs.cloud.google.com/document-ai/docs/create-dataset
- Google Cloud Document AI v1beta3 Python DocumentServiceClient reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1beta3.services.document_service.DocumentServiceClient
- Google Cloud Document AI v1beta3 Python ImportDocumentsRequest reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1beta3.types.ImportDocumentsRequest
- Google Cloud Document AI v1beta3 Python ListDocumentsRequest reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1beta3.types.ListDocumentsRequest
- Google Cloud Document AI v1beta3 Python DocumentMetadata reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1beta3.types.DocumentMetadata
- Google Cloud Storage bucket creation documentation: https://docs.cloud.google.com/storage/docs/creating-buckets
- Google Cloud SDK gcloud storage buckets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud SDK gcloud storage ls reference: https://cloud.google.com/sdk/gcloud/reference/storage/ls

## Issues Found
- The post recommended only 10 sample documents and at least 5 testing documents. Google current guidance for training a model-based custom extractor requires 10 documents in the training set and 10 in the testing set, so the prerequisites, labeling guidance, train/test split, and pitfall wording were updated.
- The Cloud Storage examples used `gsutil`. Google now recommends `gcloud storage` commands instead of `gsutil`, so the bucket creation, upload, and listing commands were updated to `gcloud storage`.
- The processor creation snippet did not configure the regional API endpoint or use the client helper for the location resource path. The snippet now follows the official Python client pattern with `ClientOptions` and `common_location_path`.
- The schema section said the schema could be defined programmatically but only fetched processor metadata. This was changed to inspecting the current dataset schema with `DocumentServiceClient.get_dataset_schema`.
- The document import snippet used the wrong service client and message types for dataset imports. It now uses `documentai_v1beta3.DocumentServiceClient`, `BatchDocumentsInputConfig`, `GcsPrefix`, and `BatchDocumentsImportConfig`.
- The document listing snippet used the wrong service client and iterated a nonexistent `document_metadata` property on the pager. It now uses `DocumentServiceClient.list_documents` and iterates the returned pager directly.

## Review Notes
The Python snippets were syntax-checked locally. They were not executed against a live Google Cloud project because the workspace does not have Google Cloud SDK/client libraries or project credentials configured.
