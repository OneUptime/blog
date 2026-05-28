# Validation Summary: How to Build a Knowledge Graph from Unstructured Data with Gemini

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Gemini on Vertex AI
- Google Gen AI SDK for Python
- Cloud Spanner
- Spanner Graph
- Graph Query Language (GQL)
- Cloud Storage
- Cloud Run functions / Functions Framework for Python
- Python

## Sources Consulted
- Google Gen AI libraries: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/libraries
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/
- Spanner Graph overview: https://docs.cloud.google.com/spanner/docs/graph
- Spanner Graph schema overview: https://docs.cloud.google.com/spanner/docs/graph/schema-overview
- Spanner Graph queries overview: https://docs.cloud.google.com/spanner/docs/graph/queries-overview
- Spanner GQL query statements reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/graph-query-statements
- Spanner GQL patterns reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/graph-patterns
- Spanner GQL functions reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/graph-gql-functions
- Spanner Python batch mutations reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/batch-usage
- Spanner commit timestamps documentation: https://docs.cloud.google.com/spanner/docs/commit-timestamp
- Spanner JSON data documentation: https://docs.cloud.google.com/spanner/docs/working-with-json
- gcloud spanner instances create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- gcloud spanner databases create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Cloud Storage functions sample for Python: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage

## Issues Found
- The setup command installed the deprecated Vertex AI `GenerativeModel` SDK path and omitted packages used by the Cloud Function. Updated the package list to use `google-genai` and include `google-cloud-storage` and `functions-framework`.
- The Spanner instance creation command did not set an Enterprise edition. Spanner Graph is available in Enterprise and Enterprise Plus, so the command now includes `--edition=ENTERPRISE`.
- The Gemini extraction code used `vertexai.generative_models.GenerativeModel`, which Google documents as deprecated in May 2026. Replaced it with the current `google-genai` client configured for Vertex AI and JSON response MIME type.
- The first GQL query treated a quantified edge variable like a single edge. Updated it to aggregate path confidence and return relationship types as an array for one- or two-hop paths.
- The shortest-path GQL example used `SHORTEST` instead of the documented `ANY SHORTEST` path search prefix and returned a graph path directly. Updated it to use `ANY SHORTEST` and `TO_JSON(path)`.
- The processing pipeline deduplicated entities after extracting relationships but did not remap relationships to the retained entity IDs. Updated the deduplication helper to return an ID map and remap relationships before insertion.
- The pipeline comment said Gemini handles about 30K tokens well, which is outdated for current Gemini context windows. Reworded the comment to describe chunking as an extraction-quality choice.

## Review Notes
Python snippets were checked with `ast.parse` for syntax. Google Cloud services and SDKs were not installed locally, so runtime behavior was verified against official documentation rather than by executing calls against Google Cloud.
