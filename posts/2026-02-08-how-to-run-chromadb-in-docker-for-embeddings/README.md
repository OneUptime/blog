# How to Run ChromaDB in Docker for Embeddings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, ChromaDB, Vector Database, AI, Embeddings, Machine Learning

Description: Run ChromaDB in Docker for storing and querying embeddings with practical examples for RAG and semantic search

---

ChromaDB is an open-source embedding database designed to be simple. While Milvus and Qdrant target large-scale production deployments, Chroma focuses on developer experience and getting AI applications running quickly. It has a Python-first API, built-in embedding functions, and can run as both an embedded library and a standalone server. Docker gives you the server mode, which separates your database from your application.

## Why ChromaDB?

Building AI applications often involves a frustrating amount of boilerplate. You need an embedding model, a way to store vectors, metadata filtering, and a query interface. ChromaDB wraps all of this into a clean API. You can pass raw text to Chroma and it handles embedding generation for you, or you can bring your own embeddings.

For RAG (Retrieval-Augmented Generation) applications, prototyping, and small-to-medium scale production, Chroma is a practical choice. It gets out of your way and lets you focus on the application logic.

## Quick Start with Docker

Run ChromaDB as a standalone server.

```bash
# Start ChromaDB server
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chroma_data:/chroma/chroma \
  -e ANONYMIZED_TELEMETRY=FALSE \
  chromadb/chroma:0.5.0
```

Verify it is running.

```bash
# Check the heartbeat endpoint
curl http://localhost:8000/api/v1/heartbeat

# Check the version
curl http://localhost:8000/api/v1/version
```

## Docker Compose Setup

A production-ready configuration with resource limits and persistence.

```yaml
# docker-compose.yml
version: "3.8"

services:
  chromadb:
    image: chromadb/chroma:0.5.0
    container_name: chromadb
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      # Disable anonymous telemetry
      ANONYMIZED_TELEMETRY: "FALSE"
      # Enable authentication (optional)
      CHROMA_SERVER_AUTHN_PROVIDER: "chromadb.auth.token_authn.TokenAuthenticationServerProvider"
      CHROMA_SERVER_AUTHN_CREDENTIALS: "my-secret-token"
      # Persistence settings
      IS_PERSISTENT: "TRUE"
      PERSIST_DIRECTORY: "/chroma/chroma"
    volumes:
      - chroma_data:/chroma/chroma
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 15s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G

volumes:
  chroma_data:
    driver: local
```

```bash
docker compose up -d
```

## Installing the Python Client

```bash
pip install chromadb
```

## Connecting to the Server

```python
# connect.py
import chromadb

# Connect to the Docker ChromaDB server
client = chromadb.HttpClient(
    host="localhost",
    port=8000,
    # Include token if authentication is enabled
    headers={"Authorization": "Bearer my-secret-token"}
)

# Verify the connection
print(f"Heartbeat: {client.heartbeat()}")
print(f"Version: {client.get_version()}")
```

## Creating Collections and Adding Documents

Chroma's simplest workflow lets you add raw text. If you do not provide embeddings, Chroma generates them automatically using its default embedding function.

```python
# basic_usage.py
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)

# Create or get a collection
# Chroma uses its own default embedding function if you do not specify one
collection = client.get_or_create_collection(
    name="knowledge_base",
    metadata={"hnsw:space": "cosine"}  # Use cosine similarity
)

# Add documents - Chroma handles embedding automatically
collection.add(
    documents=[
        "Docker containers package applications with their dependencies",
        "Kubernetes orchestrates containers across multiple hosts",
        "PostgreSQL is a powerful open-source relational database",
        "Redis is an in-memory data structure store used for caching",
        "Nginx is a high-performance web server and reverse proxy",
        "Git is a distributed version control system",
        "CI/CD pipelines automate building, testing, and deploying code",
        "Monitoring systems track application health and performance",
    ],
    metadatas=[
        {"category": "containers", "difficulty": "beginner"},
        {"category": "containers", "difficulty": "intermediate"},
        {"category": "databases", "difficulty": "intermediate"},
        {"category": "databases", "difficulty": "beginner"},
        {"category": "web-servers", "difficulty": "beginner"},
        {"category": "tools", "difficulty": "beginner"},
        {"category": "devops", "difficulty": "intermediate"},
        {"category": "devops", "difficulty": "intermediate"},
    ],
    ids=["doc1", "doc2", "doc3", "doc4", "doc5", "doc6", "doc7", "doc8"]
)

print(f"Collection '{collection.name}' has {collection.count()} documents")
```

## Querying by Similarity

Search for documents similar to a query string.

```python
# query.py
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

# Query with natural language - Chroma handles embedding the query
results = collection.query(
    query_texts=["How do I deploy applications?"],
    n_results=3
)

print("Query: 'How do I deploy applications?'")
print("-" * 50)
for i, (doc, distance, metadata) in enumerate(zip(
    results["documents"][0],
    results["distances"][0],
    results["metadatas"][0]
)):
    print(f"  {i+1}. [{metadata['category']}] {doc}")
    print(f"     Distance: {distance:.4f}")
```

## Filtering with Metadata

Combine vector search with metadata filters for more precise results.

```python
# filtered_query.py
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

# Search only within the "databases" category
results = collection.query(
    query_texts=["fast data storage"],
    n_results=3,
    where={"category": "databases"}
)

# Combine multiple filter conditions
results = collection.query(
    query_texts=["getting started with infrastructure"],
    n_results=5,
    where={
        "$and": [
            {"difficulty": "beginner"},
            {"category": {"$in": ["containers", "devops"]}}
        ]
    }
)

for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
    print(f"[{meta['category']}] {doc}")
```

## Using Custom Embedding Functions

Bring your own embedding model for better quality.

```python
# custom_embeddings.py
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

client = chromadb.HttpClient(host="localhost", port=8000)

# Use sentence-transformers for higher quality embeddings
embedding_fn = SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Create a collection with the custom embedding function
collection = client.get_or_create_collection(
    name="high_quality_docs",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

# Add documents (embeddings generated by sentence-transformers)
collection.add(
    documents=[
        "Vector databases store high-dimensional embeddings for similarity search",
        "Relational databases organize data in tables with rows and columns",
        "Document databases store flexible JSON-like documents",
    ],
    ids=["vec-db", "rel-db", "doc-db"]
)

# Query using the same embedding function
results = collection.query(
    query_texts=["Which database is best for AI applications?"],
    n_results=2
)

for doc, dist in zip(results["documents"][0], results["distances"][0]):
    print(f"Distance: {dist:.4f} - {doc}")
```

## Building a RAG Pipeline

Here is a complete RAG (Retrieval-Augmented Generation) example using ChromaDB for context retrieval.

```python
# rag_pipeline.py
import chromadb
import openai

# Connect to ChromaDB
chroma_client = chromadb.HttpClient(host="localhost", port=8000)

# Set up the knowledge base collection
collection = chroma_client.get_or_create_collection("company_docs")

# Load your knowledge base (run once)
def load_knowledge_base():
    documents = [
        "Our refund policy allows returns within 30 days of purchase.",
        "Premium plans include 24/7 phone support and a dedicated account manager.",
        "Free tier users get 5GB of storage and 1000 API calls per month.",
        "Enterprise customers can request custom SLAs with 99.99% uptime guarantees.",
        "Password resets can be done through the settings page or by contacting support.",
    ]
    collection.add(
        documents=documents,
        ids=[f"doc-{i}" for i in range(len(documents))]
    )

# RAG query function
def ask_with_context(question, n_context=3):
    # Step 1: Retrieve relevant context from ChromaDB
    results = collection.query(
        query_texts=[question],
        n_results=n_context
    )
    context = "\n".join(results["documents"][0])

    # Step 2: Build the prompt with retrieved context
    prompt = f"""Answer the question based on the following context.
If the context doesn't contain the answer, say "I don't have that information."

Context:
{context}

Question: {question}
Answer:"""

    # Step 3: Send to LLM (example with OpenAI)
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200
    )

    return response.choices[0].message.content

# Usage
# load_knowledge_base()  # Run once to populate
# answer = ask_with_context("What is the refund policy?")
# print(answer)
```

## Updating and Deleting Documents

```python
# manage_docs.py
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

# Update a document (upsert)
collection.update(
    ids=["doc1"],
    documents=["Docker containers package applications with all their dependencies for consistent deployment"],
    metadatas=[{"category": "containers", "difficulty": "beginner", "updated": True}]
)

# Delete specific documents
collection.delete(ids=["doc6"])

# Delete by filter
collection.delete(where={"difficulty": "beginner"})

# Check remaining count
print(f"Remaining documents: {collection.count()}")
```

## Monitoring and Administration

```bash
# Check container health
docker stats chromadb --no-stream

# View container logs
docker logs chromadb --tail 50

# List collections via API
curl http://localhost:8000/api/v1/collections

# Get collection details
curl http://localhost:8000/api/v1/collections/knowledge_base
```

## Summary

ChromaDB in Docker provides a developer-friendly vector database for embedding storage and retrieval. Its built-in embedding functions let you start with raw text and skip the embedding pipeline boilerplate. For production, bring your own embedding model, enable token authentication, and use persistent volumes. ChromaDB works especially well for RAG applications where you need to retrieve relevant context for LLM prompts. The API is clean, the Python client is intuitive, and Docker deployment takes seconds.
