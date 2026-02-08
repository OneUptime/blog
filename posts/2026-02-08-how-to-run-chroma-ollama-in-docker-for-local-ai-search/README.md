# How to Run Chroma + Ollama in Docker for Local AI Search

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Chroma, Ollama, AI, Vector Database, Local AI, Search, Machine Learning, Embeddings

Description: Learn how to set up Chroma vector database and Ollama LLM in Docker for building local AI-powered search systems.

---

Building AI-powered search used to require cloud APIs, expensive GPU instances, and complex infrastructure. That is no longer the case. With Chroma as your vector database and Ollama serving local LLMs, you can build a fully private, local AI search system running entirely in Docker containers.

This guide walks you through setting up both services, generating embeddings, indexing documents, and querying them with natural language - all without sending a single byte to an external API.

## Why Run AI Search Locally?

There are several practical reasons to keep your AI search pipeline on your own hardware. Data privacy tops the list. If you work with sensitive documents, medical records, or proprietary code, shipping that data to OpenAI or Google is a non-starter. Cost is another factor. API calls add up fast when you index thousands of documents. And latency matters too - local inference eliminates network round-trips.

Chroma is a lightweight, open-source vector database built for AI applications. Ollama makes it trivial to run models like Llama, Mistral, or Nomic locally. Together, they form the backbone of a search system that you fully control.

## Prerequisites

You need Docker and Docker Compose installed on your machine. For reasonable performance with Ollama, at least 8 GB of RAM is recommended. If you have a GPU, Ollama can use it, but CPU-only mode works fine for smaller models.

## Setting Up the Docker Compose Stack

Create a project directory and add a `docker-compose.yml` file that runs both Chroma and Ollama side by side.

```yaml
# docker-compose.yml - Defines the Chroma + Ollama stack
version: "3.8"

services:
  # Ollama serves local LLMs for generating embeddings and completions
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Uncomment the following lines if you have an NVIDIA GPU
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

  # Chroma is the vector database that stores and queries embeddings
  chroma:
    image: chromadb/chroma:latest
    container_name: chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - ANONYMIZED_TELEMETRY=false
      - IS_PERSISTENT=TRUE

volumes:
  ollama_data:
  chroma_data:
```

Start the stack with a single command.

```bash
# Launch both containers in detached mode
docker compose up -d
```

Verify both services are running.

```bash
# Check container status
docker compose ps
```

## Pulling an Embedding Model with Ollama

Ollama needs a model to generate embeddings. The `nomic-embed-text` model is a solid choice for search applications - it is small, fast, and produces high-quality embeddings.

```bash
# Pull the nomic-embed-text model (about 274 MB)
docker exec ollama ollama pull nomic-embed-text
```

If you also want a language model for generating answers from search results, pull one of the smaller Llama models.

```bash
# Pull a lightweight language model for answer generation
docker exec ollama ollama pull llama3.2:3b
```

You can verify the models are available.

```bash
# List all downloaded models
docker exec ollama ollama list
```

## Testing Ollama Embeddings

Before wiring everything together, confirm that Ollama generates embeddings correctly.

```bash
# Generate an embedding vector for a test string
curl http://localhost:11434/api/embeddings \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "Docker makes containerization simple"
  }'
```

You should see a JSON response with a large array of floating-point numbers. That array is the embedding vector representing the semantic meaning of the input text.

## Connecting to Chroma and Indexing Documents

Now write a Python script that ties everything together. This script generates embeddings with Ollama and stores them in Chroma.

```python
# index_documents.py - Index documents into Chroma using Ollama embeddings
import chromadb
import requests
import json

# Connect to the Chroma instance running in Docker
client = chromadb.HttpClient(host="localhost", port=8000)

# Create or get a collection for our documents
collection = client.get_or_create_collection(
    name="knowledge_base",
    metadata={"hnsw:space": "cosine"}  # Use cosine similarity for search
)

def get_embedding(text):
    """Generate an embedding vector using Ollama's nomic-embed-text model."""
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]

# Sample documents to index
documents = [
    "Docker containers package applications with their dependencies for consistent deployment.",
    "Kubernetes orchestrates container workloads across clusters of machines.",
    "PostgreSQL is a powerful open-source relational database system.",
    "Redis provides in-memory data structures for caching and message brokering.",
    "Nginx serves as a reverse proxy and load balancer for web applications.",
    "Prometheus collects and stores time-series metrics for monitoring systems.",
    "Grafana visualizes metrics and logs from multiple data sources.",
    "Git tracks changes in source code during software development.",
]

# Generate embeddings and add documents to Chroma
embeddings = [get_embedding(doc) for doc in documents]

collection.add(
    ids=[f"doc_{i}" for i in range(len(documents))],
    documents=documents,
    embeddings=embeddings
)

print(f"Indexed {len(documents)} documents into Chroma.")
```

Run the indexing script.

```bash
# Install Python dependencies and run the indexer
pip install chromadb requests
python index_documents.py
```

## Querying the Search System

With documents indexed, you can search using natural language queries. The system converts your query into an embedding and finds the most semantically similar documents.

```python
# search.py - Query the Chroma vector database with natural language
import chromadb
import requests

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

def get_embedding(text):
    """Generate an embedding for the search query."""
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]

def search(query, n_results=3):
    """Search for documents matching the query."""
    query_embedding = get_embedding(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    return results

# Run a sample search
query = "How do I deploy applications?"
results = search(query)

print(f"Query: {query}\n")
for i, (doc, distance) in enumerate(zip(results["documents"][0], results["distances"][0])):
    print(f"  Result {i+1} (distance: {distance:.4f}): {doc}")
```

## Adding RAG (Retrieval-Augmented Generation)

Take it a step further by feeding search results into Ollama's language model to generate answers.

```python
# rag_search.py - Combine search results with LLM generation
import chromadb
import requests
import json

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

def get_embedding(text):
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]

def generate_answer(query, context_docs):
    """Use Ollama to generate an answer based on retrieved documents."""
    context = "\n".join(context_docs)
    prompt = f"""Based on the following context, answer the question.

Context:
{context}

Question: {query}

Answer:"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3.2:3b", "prompt": prompt, "stream": False}
    )
    return response.json()["response"]

# Search and generate an answer
query = "What tools help with monitoring?"
query_embedding = get_embedding(query)
results = collection.query(query_embeddings=[query_embedding], n_results=3)

answer = generate_answer(query, results["documents"][0])
print(f"Q: {query}")
print(f"A: {answer}")
```

## Persisting Data Across Restarts

The Docker Compose file already mounts named volumes for both Chroma and Ollama. Your indexed documents and downloaded models survive container restarts. To verify persistence, stop and restart the stack.

```bash
# Stop the stack
docker compose down

# Start it again - data persists in named volumes
docker compose up -d

# Verify your collection still exists
python -c "
import chromadb
client = chromadb.HttpClient(host='localhost', port=8000)
print(client.list_collections())
"
```

## Production Considerations

For a production deployment, consider adding authentication to Chroma using the `CHROMA_SERVER_AUTH_CREDENTIALS` environment variable. Set resource limits on the Ollama container to prevent it from consuming all available memory during inference. And if you index large document sets, batch your embedding calls to avoid overwhelming Ollama.

```yaml
# Production additions to docker-compose.yml
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 8G
  chroma:
    environment:
      - CHROMA_SERVER_AUTHN_PROVIDER=chromadb.auth.token_authn.TokenAuthenticationServerProvider
      - CHROMA_SERVER_AUTHN_CREDENTIALS=your-secret-token
```

## Wrapping Up

Running Chroma and Ollama in Docker gives you a private, self-hosted AI search system. You control the data, the models, and the infrastructure. The setup takes minutes, the resource requirements are reasonable, and the search quality is genuinely impressive with modern embedding models. Whether you are building an internal knowledge base, a document search tool, or a coding assistant, this stack provides a solid foundation that you can extend as your needs grow.
