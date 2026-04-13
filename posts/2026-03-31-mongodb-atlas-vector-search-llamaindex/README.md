# How to Use MongoDB Atlas Vector Search with LlamaIndex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Vector Search, LlamaIndex, AI

Description: Learn how to use MongoDB Atlas as a vector store backend in LlamaIndex to build RAG applications with document indexing, semantic retrieval, and query engines.

---

## Overview

LlamaIndex (formerly GPT Index) provides high-level abstractions for building retrieval-augmented generation systems. MongoDB Atlas Vector Search integrates as a vector store backend, letting you index documents, store embeddings, and run semantic queries using LlamaIndex's query engine.

## Installation

```bash
pip install llama-index llama-index-vector-stores-mongodb llama-index-embeddings-openai pymongo
```

## Creating an Atlas Vector Search Index

In the Atlas UI, create a vector search index on your collection named `vector_index`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

## Setting Up the Vector Store

```python
from pymongo import MongoClient
from llama_index.vector_stores.mongodb import MongoDBAtlasVectorSearch
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.embeddings.openai import OpenAIEmbedding

# Configure embedding model globally
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Connect to MongoDB Atlas
client = MongoClient(MONGODB_URI)
collection = client["rag_db"]["documents"]

vector_store = MongoDBAtlasVectorSearch(
    mongodb_client=client,
    db_name="rag_db",
    collection_name="documents",
    vector_index_name="vector_index"
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)
```

## Indexing Documents from Files

```python
from llama_index.core import SimpleDirectoryReader

# Load documents from a directory
documents = SimpleDirectoryReader("./docs").load_data()

# Create the index - this embeds and stores documents in MongoDB
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_context,
    show_progress=True
)

print(f"Indexed {len(documents)} documents into MongoDB Atlas")
```

## Indexing Documents from Text

```python
from llama_index.core import Document

docs = [
    Document(text="MongoDB Atlas Vector Search provides ANN queries on embeddings stored in Atlas."),
    Document(text="LlamaIndex simplifies building RAG applications with modular components."),
]

index = VectorStoreIndex.from_documents(docs, storage_context=storage_context)
```

## Loading an Existing Index

```python
# Reconnect to an existing index without re-embedding
index = VectorStoreIndex.from_vector_store(
    vector_store=vector_store
)
```

## Querying with the Query Engine

```python
query_engine = index.as_query_engine(similarity_top_k=4)

response = query_engine.query(
    "How does MongoDB Atlas Vector Search handle approximate nearest neighbor queries?"
)

print(response.response)
print("\nSource nodes:")
for node in response.source_nodes:
    print(f"  Score: {node.score:.4f} | {node.text[:80]}...")
```

## Retriever-Only Usage

```python
retriever = index.as_retriever(similarity_top_k=5)
nodes = retriever.retrieve("vector search performance tuning")

for node in nodes:
    print(f"Score: {node.score:.4f}")
    print(f"Text: {node.text[:100]}\n")
```

## Metadata Filtering

```python
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter

filters = MetadataFilters(filters=[
    MetadataFilter(key="category", value="databases")
])

query_engine = index.as_query_engine(
    similarity_top_k=5,
    filters=filters
)

response = query_engine.query("What are the best practices for indexing?")
```

## Best Practices

- Call `VectorStoreIndex.from_vector_store()` to reuse an existing index rather than re-embedding all documents on every startup.
- Set `Settings.embed_model` globally in LlamaIndex rather than passing it per-call for consistent embeddings throughout your pipeline.
- Use `similarity_top_k=4` to `8` for RAG - too few misses relevant context, too many dilutes the answer quality.
- Add `metadata` to each `Document` (source URL, document ID, section title) so your query engine can cite sources in responses.

## Summary

LlamaIndex's `MongoDBAtlasVectorSearch` integration lets you index documents into Atlas Vector Search and build query engines with a few lines of code. Load existing indexes without re-embedding, use metadata filters to scope queries, and use the retriever interface for custom RAG pipelines.
