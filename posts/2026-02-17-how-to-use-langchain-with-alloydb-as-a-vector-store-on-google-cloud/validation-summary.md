# Validation Summary: How to Use LangChain with AlloyDB as a Vector Store on Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB Python Connector
- LangChain
- langchain-google-alloydb-pg
- langchain-google-genai
- pgvector
- Vertex AI / Gemini embeddings and chat models
- SQLAlchemy
- Retrieval-augmented generation (RAG)

## Sources Consulted
- Google Cloud AlloyDB Python connector documentation: https://cloud.google.com/alloydb/docs/connect-language-connectors
- Google Cloud langchain-google-alloydb-pg AlloyDBVectorStore API reference: https://docs.cloud.google.com/python/docs/reference/langchain-google-alloydb-pg/latest/langchain_google_alloydb_pg.vectorstore.AlloyDBVectorStore
- Google Cloud langchain-google-alloydb-pg AlloyDBEngine API reference: https://docs.cloud.google.com/python/docs/reference/langchain-google-alloydb-pg/latest/langchain_google_alloydb_pg.engine.AlloyDBEngine
- LangChain AlloyDB vector store integration documentation: https://docs.langchain.com/oss/python/integrations/vectorstores/google_alloydb
- Google Cloud AlloyDB HNSW index documentation: https://docs.cloud.google.com/alloydb/docs/ai/create-hnsw-index
- Google Cloud AlloyDB IVFFlat index documentation: https://docs.cloud.google.com/alloydb/docs/ai/create-ivfflat-index
- Google Cloud Vertex AI text embeddings API documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- LangChain Google provider documentation: https://docs.langchain.com/oss/python/integrations/providers/google/
- LangChain ChatGoogleGenerativeAI documentation: https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai
- LangChain GoogleGenerativeAIEmbeddings API reference: https://reference.langchain.com/python/langchain-google-genai/embeddings/GoogleGenerativeAIEmbeddings
- LangChain RecursiveCharacterTextSplitter documentation: https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter
- LangChain Document API reference: https://reference.langchain.com/v0.3/python/core/documents/langchain_core.documents.base.Document.html

## Issues Found
- The AlloyDB connector import used `google.cloud.alloydb.connector`, but current Google Cloud documentation uses `google.cloud.alloydbconnector`. Updated the import.
- The vector store snippet implied `AlloyDBVectorStore.create_sync()` creates the table automatically. Current docs require initializing the vector store table first with `AlloyDBEngine.init_vectorstore_table()`. Added the table initialization call.
- The custom metadata columns were passed only as string names. Current AlloyDB table initialization requires `Column` definitions for custom metadata columns. Added `Column("source", "TEXT")`, `Column("title", "TEXT")`, and `Column("chunk_index", "INTEGER")`.
- The embedding example used `VertexAIEmbeddings` from `langchain_google_vertexai`, which LangChain now marks as deprecated for Gemini embeddings. Updated the snippet to use `GoogleGenerativeAIEmbeddings` with the Vertex AI backend.
- The table vector size was implicit. Added `output_dimensionality=768` and `vector_size=768` so the embedding output and AlloyDB vector column match.
- The post used older LangChain imports for `Document` and `RecursiveCharacterTextSplitter`. Updated them to `langchain_core.documents` and `langchain_text_splitters`.
- The metadata filter used dictionary syntax, but AlloyDBVectorStore filters are SQL filter strings. Updated the example to `filter="source = 'alloydb-docs'"`.
- The RAG examples used deprecated LangChain classes (`RetrievalQA`, `ConversationalRetrievalChain`, and `ConversationBufferMemory`) and the deprecated `VertexAI` LLM wrapper for Gemini. Reworked the snippets to use `ChatGoogleGenerativeAI`, the retriever interface, prompt formatting, and message history directly.
- The stats query read `metadata->>'source'`, but the corrected schema stores `source` as a dedicated metadata column. Updated the query to group by the `source` column.

## Review Notes
The HNSW and IVFFlat SQL examples match the documented pgvector/AlloyDB index syntax. The examples still use placeholder project, cluster, instance, database, user, and password values, so they are illustrative rather than directly runnable without environment-specific configuration.
