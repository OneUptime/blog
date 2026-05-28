# Validation Summary: How to Build a RAG Application with LangChain and BigQuery Vector Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery vector indexes
- BigQuery `VECTOR_SEARCH`
- LangChain
- Google Gemini models on Vertex AI
- Python
- Retrieval-augmented generation

## Sources Consulted
- Google Cloud BigQuery vector search documentation: https://docs.cloud.google.com/bigquery/docs/vector-search
- Google Cloud BigQuery vector index documentation: https://docs.cloud.google.com/bigquery/docs/vector-index
- GoogleSQL `VECTOR_SEARCH` reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/search_functions#vector_search
- GoogleSQL `ML.DISTANCE` reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-distance
- Google Cloud BigQuery Python client `insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json
- LangChain Google integrations documentation: https://docs.langchain.com/oss/python/integrations/providers/google/
- LangChain Google Vertex AI embeddings documentation: https://docs.langchain.com/oss/python/integrations/embeddings/google_vertex_ai
- LangChain text splitter documentation: https://docs.langchain.com/oss/python/integrations/splitters/index
- LangChain `Document` reference: https://reference.langchain.com/v0.3/python/core/documents/langchain_core.documents.base.Document.html
- LangChain `BaseRetriever` reference: https://api.python.langchain.com/en/latest/core/retrievers/langchain_core.retrievers.BaseRetriever.html

## Issues Found
- The setup example used `langchain-google-vertexai` `VertexAI` and `VertexAIEmbeddings` for Gemini models. LangChain now documents `langchain-google-genai` as the current package for Gemini chat models and embeddings, with `langchain-google-vertexai` focused on Vertex AI platform services and older Gemini classes marked deprecated. Updated the dependency list, imports, environment setup, embedding model, and LLM initialization.
- The chunking example imported `RecursiveCharacterTextSplitter` from `langchain.text_splitter`, which is an older import path. Updated it to `langchain_text_splitters`, matching current LangChain documentation.
- The vector search example manually computed `ML.DISTANCE` and sorted all rows. That can work as brute-force distance scoring, but it does not use the BigQuery vector index created in the prior section. Replaced it with BigQuery's `VECTOR_SEARCH` function, using `query_value`, `top_k`, and `distance_type => 'COSINE'`.
- The vector search query interpolated embedding values and `top_k` into SQL. Updated it to use BigQuery query parameters.
- The JSON metadata example inserted `json.dumps(...)` into a `JSON` column and then selected the JSON column directly. Updated insertion to pass the metadata object and selected `TO_JSON_STRING(base.metadata)` for reliable parsing in Python.
- The custom retriever used the older `get_relevant_documents` pattern without subclassing LangChain's current retriever base class. Updated it to subclass `BaseRetriever`, implement `_get_relevant_documents`, and call `invoke`.
- The RAG pipeline used a chat model but returned the raw message object from `invoke`. Updated it to return `.content`.
- The delete query interpolated `document_id` directly into SQL. Updated it to use a BigQuery query parameter.

## Review Notes
The examples were reviewed for API correctness against current documentation, but they were not executed against a live Google Cloud project because that would require configured credentials, enabled APIs, billing, and a populated BigQuery dataset. BigQuery vector indexes are maintained asynchronously, so newly inserted rows can have a delay before index coverage reaches 100%, although `VECTOR_SEARCH` still accounts for unindexed rows by falling back where needed.
