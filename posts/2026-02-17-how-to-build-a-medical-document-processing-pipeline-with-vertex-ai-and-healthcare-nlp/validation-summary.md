# Validation Summary: How to Build a Medical Document Processing Pipeline with Vertex AI

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Google Cloud Healthcare API
- Healthcare Natural Language API
- Document AI
- Vertex AI Gemini API
- Google Gen AI SDK for Python
- FHIR R4
- BigQuery
- Vertex AI Search
- Python
- gcloud CLI

## Sources Consulted
- Cloud Healthcare API `nlp.analyzeEntities` REST reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.services.nlp/analyzeEntities
- Cloud Healthcare API FHIR resource creation guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-resources
- Cloud Healthcare API `fhir.create` REST reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores.fhir/create
- `gcloud healthcare fhir-stores create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/create
- Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Gen AI SDK for Vertex AI overview: https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview
- Vertex AI Gemini content generation parameters: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
- Document AI `DocumentProcessorServiceClient` / `ProcessRequest` Python reference and samples: https://cloud.google.com/document-ai/docs/process-documents-client-libraries

## Issues Found
- The Healthcare NLP parser used `entities` as if they were extracted text mentions and referenced fields such as `mentionText`, `entityType`, and relationship `relationType`. The official response returns extracted mentions in `entityMentions`, normalized concepts in `entities`, and relationships by `subjectId` / `objectId`. Updated the parser to use `entityMentions`, join linked concepts through `linkedEntities`, and resolve relationship IDs back to mention text.
- The Healthcare NLP request included `RXNORM` and `LOINC` in `licensedVocabularies`, but the official enum only supports `ICD10CM` and `SNOMEDCT_US` as licensed vocabularies. Removed the unsupported request values while preserving downstream support for vocabulary codes such as RxNorm and LOINC if returned.
- The FHIR store creation command used `--version=R4`; the official gcloud reference lists the value as `r4`. Updated the command to use the documented casing.
- The Document AI client did not configure the regional API endpoint, which is required by the official regional processor samples. Added `client_options` with the location-specific endpoint and improved MIME detection for `.jpeg` and uppercase file extensions.
- The FHIR conversion example assigned client-side UUIDs before using the FHIR create interaction, but Cloud Healthcare API create uses server-assigned resource IDs. Removed client-supplied IDs from generated resources.
- The MedicationStatement example called `_find_related_dosage` without defining it and did not pass relationship data into FHIR conversion. Added the helper and an optional `relationships` parameter.
- The FHIR storage code used `requests` without importing it in that standalone code block. Added the import.
- The Vertex AI Gemini example used `vertexai.generative_models`, which is deprecated and scheduled for removal after June 24, 2026. Updated it to the current Google Gen AI SDK pattern for Vertex AI with `genai.Client` and `GenerateContentConfig`.

## Review Notes
The post is technically relevant and salvageable. The examples are still demonstration code and do not cover production concerns such as batching, retries, PHI redaction workflows, FHIR validation, patient identity matching, IAM least privilege, or full HIPAA operational controls. Python code blocks were syntax-checked with `python3` after the corrections.
