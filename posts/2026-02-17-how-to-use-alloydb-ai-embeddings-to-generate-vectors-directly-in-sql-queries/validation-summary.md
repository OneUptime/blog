# Validation Summary: How to Use AlloyDB AI Embeddings to Generate Vectors Directly in SQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB AI and `google_ml_integration`
- Vertex AI text embeddings
- PostgreSQL SQL and PL/pgSQL
- pgvector vector search and HNSW indexes
- Google Cloud CLI

## Sources Consulted
- AlloyDB for PostgreSQL: Generate text embeddings: https://docs.cloud.google.com/alloydb/docs/ai/work-with-embeddings
- AlloyDB for PostgreSQL: Register and call remote AI models using model endpoint management: https://docs.cloud.google.com/alloydb/docs/ai/register-model-endpoint
- AlloyDB for PostgreSQL: Model endpoint management reference: https://docs.cloud.google.com/alloydb/docs/reference/model-endpoint
- AlloyDB for PostgreSQL: Integrate with Vertex AI: https://docs.cloud.google.com/alloydb/docs/ai/configure-vertex-ai
- AlloyDB for PostgreSQL: Supported database flags: https://docs.cloud.google.com/alloydb/docs/reference/database-flags
- Google Cloud SDK: `gcloud alloydb clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK: `gcloud alloydb instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Vertex AI: Text embeddings API: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- pgvector documentation: https://github.com/pgvector/pgvector

## Issues Found
- The post said there are "No external API calls", but AlloyDB still calls Vertex AI from inside the database. Changed this to "No external API calls from your application" to keep the claim precise.
- The prerequisites said a Vertex AI endpoint must be configured. For the documented publisher embedding model flow, the key requirements are the Vertex AI API and IAM permission for the AlloyDB service agent. Updated the prerequisite sentence accordingly.
- The `google_ml.create_model` example used the outdated `textembedding-gecko@003` model name and `model_type => 'cloud_ai'`, which does not match current AlloyDB model endpoint management. Updated it to register `text-multilingual-embedding-002` with `model_type => 'text_embedding'`, `model_auth_type => 'alloydb_service_agent_iam'`, and the documented Vertex AI transform functions.
- Added `ALTER EXTENSION google_ml_integration UPDATE;` after creating the extension so the tutorial aligns with current AlloyDB guidance to use an up-to-date extension version.
- The `gcloud alloydb clusters describe` format selector used `serviceAccountEmailAddress`; the AlloyDB cluster API field is `serviceAccountEmail`. Updated the command to use the correct field.

## Review Notes
The SQL examples are written as illustrative snippets and assume objects such as `staging_articles` already exist. `gcloud` was not installed in the local workspace, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
