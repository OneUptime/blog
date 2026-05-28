# Validation Summary: How to Implement Search Filtering with Metadata Facets in Vertex AI Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI Search / Agent Search
- Discovery Engine API
- `google-cloud-discoveryengine` Python client
- Metadata schemas, filters, and facets
- FastAPI

## Sources Consulted
- Google Cloud Agent Search schema documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/provide-schema
- Google Cloud metadata filtering documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata
- Google Cloud import documents from Cloud Storage Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-import-documents-gcs
- Discovery Engine `GcsSource` REST reference: https://docs.cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1alpha/GcsSource
- Discovery Engine v1 RPC reference for `SearchRequest`, `FacetSpec`, and `SearchResponse`: https://docs.cloud.google.com/generative-ai-app-builder/docs/reference/rpc/google.cloud.discoveryengine.v1
- Python `SchemaServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.services.schema_service.SchemaServiceClient

## Issues Found
- The schema update example called `client.update_schema(schema=schema)`, but the current Python v1 client expects an `UpdateSchemaRequest` passed as `request`. Changed the code to build `discoveryengine.UpdateSchemaRequest(schema=schema)` and call `client.update_schema(request=request)`.
- The examples accepted a `location` argument but did not configure regional API endpoints. Added `ClientOptions(api_endpoint=f"{location}-discoveryengine.googleapis.com")` for non-`global` locations, matching official Python samples.
- The sample documents used `mimeType: "text/plain"` for PDF files. Changed those MIME types to `application/pdf`.
- The `publish_date` schema used `type: "string"` even though the post discusses date filtering. Changed it to `datetime`, which is the documented type for date/time comparisons.
- Search result display code read title and metadata fields from `derived_struct_data`; retrievable metadata fields are returned in `document.struct_data`. Updated result formatting and the FastAPI response to read title/category/difficulty from `struct_data` while keeping snippets in `derived_struct_data`.
- The filter builder did not escape backslashes or double quotes inside filter literals. Added a small quoting helper that follows the documented requirement to escape those characters.
- The FastAPI endpoint accepted `page` and `page_size` but did not pass pagination to the search request. Added `page_size` and `offset` parameters to `search_with_filter` and wired the endpoint to use them.

## Review Notes
Vertex AI Search documentation is currently being rebranded as Agent Search, but the Discovery Engine API and Vertex AI Search terminology used in the post remain technically applicable. The examples were syntax-checked locally, but they were not executed against a live Google Cloud project.
