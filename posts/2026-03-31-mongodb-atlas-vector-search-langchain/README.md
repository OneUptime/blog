# How to Use MongoDB Atlas Vector Search with LangChain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Vector Search, LangChain, AI

Description: Learn how to integrate MongoDB Atlas Vector Search with LangChain to build retrieval-augmented generation applications with semantic document search.

---

## Overview

MongoDB Atlas Vector Search stores and queries high-dimensional vector embeddings alongside your documents. Combined with LangChain, it provides a powerful vector store backend for retrieval-augmented generation (RAG) applications that need to find semantically similar documents.

## Prerequisites

```bash
pip install langchain langchain-mongodb langchain-openai pymongo
```

## Creating an Atlas Vector Search Index

In the Atlas UI, create a vector search index on your collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    }
  ]
}
```

Set `numDimensions` to match your embedding model (1536 for `text-embedding-ada-002`, 384 for `all-MiniLM-L6-v2`).

## Initializing the Vector Store

```python
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
from pymongo import MongoClient

client = MongoClient(MONGODB_URI)
collection = client["rag_db"]["documents"]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = MongoDBAtlasVectorSearch(
    collection=collection,
    embedding=embeddings,
    index_name="vector_index",
    text_key="content",
    embedding_key="embedding"
)
```

## Adding Documents to the Vector Store

```python
from langchain_core.documents import Document

docs = [
    Document(
        page_content="MongoDB Atlas Vector Search enables semantic similarity queries on document embeddings.",
        metadata={"category": "databases", "source": "docs.mongodb.com"}
    ),
    Document(
        page_content="LangChain provides a standard interface for building LLM-powered applications.",
        metadata={"category": "ai", "source": "langchain.com"}
    ),
]

vector_store.add_documents(docs)
```

## Semantic Similarity Search

```python
# Find the 5 most semantically similar documents
results = vector_store.similarity_search(
    "How do I store embeddings in MongoDB?",
    k=5
)

for doc in results:
    print(doc.page_content[:100])
    print(f"  Source: {doc.metadata['source']}\n")
```

## Filtered Vector Search

```python
# Search only within a specific category
results = vector_store.similarity_search(
    "vector databases for AI applications",
    k=3,
    pre_filter={"category": {"$eq": "databases"}}
)
```

## Building a RAG Chain

```python
from langchain_openai import ChatOpenAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o", temperature=0)
retriever = vector_store.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer the user's question based on the following context:\n\n{context}"),
    ("human", "{input}")
])

question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

result = rag_chain.invoke({"input": "How does Atlas Vector Search work?"})
print(result["answer"])
for doc in result["context"]:
    print(f"  Source: {doc.metadata['source']}")
```

## Similarity Search with Scores

```python
results_with_scores = vector_store.similarity_search_with_score(
    "semantic search with MongoDB",
    k=5
)

for doc, score in results_with_scores:
    print(f"Score: {score:.4f} | {doc.page_content[:80]}")
```

## Best Practices

- Use `text-embedding-3-small` from OpenAI or `all-MiniLM-L6-v2` from Sentence Transformers for cost-effective embeddings with good quality.
- Add filter fields to your vector search index definition for metadata you use in `pre_filter` queries - this avoids post-filtering overhead.
- Chunk long documents into 300-500 token segments before embedding to improve retrieval precision.
- Store the original text alongside the embedding in the same document so you can return it without a second query.

## Summary

MongoDB Atlas Vector Search integrates natively with LangChain's `MongoDBAtlasVectorSearch` class. Add documents with embeddings, run semantic similarity queries, apply metadata filters, and wire the vector store into a LangChain RAG chain for question-answering over your document corpus.
