# How to Build a Vector Search Index in Azure AI Search with OpenAI Embeddings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure AI Search, Vector Search, OpenAI, Embeddings, Semantic Search, Azure, AI

Description: Step-by-step guide to building a vector search index in Azure AI Search using OpenAI embeddings for semantic similarity search.

---

Vector search has become a core component of modern search and retrieval-augmented generation (RAG) applications. Instead of relying on keyword matching, vector search finds documents based on semantic similarity - the actual meaning of the content. Azure AI Search supports vector search natively, and when you combine it with OpenAI embeddings, you get a powerful system for finding relevant content even when the exact words do not match.

This post covers how to generate embeddings with OpenAI, create a vector-enabled index in Azure AI Search, upload vectorized documents, and run vector queries.

## How Vector Search Works

The idea is simple. You convert text into a numerical representation (a vector or embedding) using a model like OpenAI's text-embedding-ada-002 or text-embedding-3-small. Texts with similar meanings end up with vectors that are close together in the embedding space. At query time, you convert the user's query into a vector using the same model, and the search engine finds documents whose vectors are closest to the query vector.

The distance between vectors is typically measured using cosine similarity, dot product, or Euclidean distance. Azure AI Search supports all three.

## Prerequisites

You will need:

1. An Azure AI Search service (Basic tier or higher)
2. An Azure OpenAI resource with an embedding model deployed (text-embedding-ada-002 or text-embedding-3-small)
3. Python 3.8+ with the `openai` and `azure-search-documents` packages installed

Install the required Python packages.

```bash
# Install the Azure Search and OpenAI Python SDKs
pip install azure-search-documents==11.6.0 openai
```

## Step 1: Generate Embeddings with OpenAI

First, set up the OpenAI client and generate embeddings for your documents.

```python
# generate_embeddings.py - Generate vector embeddings using Azure OpenAI
from openai import AzureOpenAI
import json

# Initialize the Azure OpenAI client
client = AzureOpenAI(
    api_key="<your-azure-openai-key>",
    api_version="2024-06-01",
    azure_endpoint="https://<your-resource>.openai.azure.com/"
)

def get_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text."""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-ada-002"  # or your deployed model name
    )
    return response.data[0].embedding

# Example: generate embeddings for a set of documents
documents = [
    {"id": "1", "title": "Introduction to Python", "content": "Python is a versatile programming language used for web development, data science, and automation."},
    {"id": "2", "title": "Getting Started with Docker", "content": "Docker containers package applications with their dependencies for consistent deployment across environments."},
    {"id": "3", "title": "Understanding Kubernetes", "content": "Kubernetes orchestrates containerized applications, handling scaling, deployment, and management automatically."},
]

# Add embedding vectors to each document
for doc in documents:
    # Combine title and content for a richer embedding
    text_to_embed = f"{doc['title']} {doc['content']}"
    doc["contentVector"] = get_embedding(text_to_embed)
    print(f"Generated embedding for: {doc['title']} (dimensions: {len(doc['contentVector'])})")
```

The text-embedding-ada-002 model produces 1536-dimensional vectors. The newer text-embedding-3-small model supports configurable dimensions and often produces better results.

## Step 2: Create a Vector Search Index

Now create an index in Azure AI Search that includes a vector field. The index definition needs a vector search configuration that specifies the algorithm and parameters.

```python
# create_index.py - Create a vector search index in Azure AI Search
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SearchField,
)
from azure.core.credentials import AzureKeyCredential

# Connect to your search service
endpoint = "https://<your-search-service>.search.windows.net"
credential = AzureKeyCredential("<your-search-admin-key>")
index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

# Define the vector search configuration
vector_search = VectorSearch(
    algorithms=[
        # HNSW is the recommended algorithm for most use cases
        HnswAlgorithmConfiguration(
            name="my-hnsw-config",
            parameters={
                "m": 4,          # Number of bi-directional links per node
                "efConstruction": 400,  # Size of dynamic candidate list during indexing
                "efSearch": 500,        # Size of dynamic candidate list during search
                "metric": "cosine"      # Distance metric
            }
        )
    ],
    profiles=[
        VectorSearchProfile(
            name="my-vector-profile",
            algorithm_configuration_name="my-hnsw-config"
        )
    ]
)

# Define the index with both text and vector fields
index = SearchIndex(
    name="vector-demo-index",
    fields=[
        SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
        SearchableField(name="title", type=SearchFieldDataType.String),
        SearchableField(name="content", type=SearchFieldDataType.String),
        # Vector field for storing embeddings
        SearchField(
            name="contentVector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=1536,  # Must match your embedding model output
            vector_search_profile_name="my-vector-profile"
        ),
    ],
    vector_search=vector_search
)

# Create the index
result = index_client.create_or_update_index(index)
print(f"Created index: {result.name}")
```

The HNSW (Hierarchical Navigable Small World) algorithm is the default and recommended choice. It provides a good balance between search accuracy and speed. The key parameters to tune are:

- **m** - controls the graph connectivity (higher values improve recall but use more memory)
- **efConstruction** - affects indexing speed and quality (higher is better quality but slower indexing)
- **efSearch** - affects query speed and quality (higher is better quality but slower queries)

## Step 3: Upload Documents with Vectors

Upload your documents, including their embedding vectors, to the index.

```python
# upload_documents.py - Upload vectorized documents to the search index
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

search_client = SearchClient(
    endpoint="https://<your-search-service>.search.windows.net",
    index_name="vector-demo-index",
    credential=AzureKeyCredential("<your-search-admin-key>")
)

# Upload the documents (with embeddings already attached from Step 1)
result = search_client.upload_documents(documents=documents)
print(f"Uploaded {len(result)} documents")

# Check for errors
for r in result:
    if not r.succeeded:
        print(f"Failed to upload document {r.key}: {r.error_message}")
```

## Step 4: Run Vector Queries

Now you can search using vector similarity. Convert the user query into an embedding and pass it to the search service.

```python
# vector_query.py - Run vector similarity searches
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential

search_client = SearchClient(
    endpoint="https://<your-search-service>.search.windows.net",
    index_name="vector-demo-index",
    credential=AzureKeyCredential("<your-search-query-key>")
)

# Generate embedding for the search query
query_text = "container orchestration and scaling"
query_vector = get_embedding(query_text)

# Create a vector query
vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=3,  # Number of results to return
    fields="contentVector"   # Which vector field to search
)

# Execute the search
results = search_client.search(
    search_text=None,  # No keyword search, pure vector
    vector_queries=[vector_query],
    select=["id", "title", "content"]
)

for result in results:
    print(f"Score: {result['@search.score']:.4f} | {result['title']}")
    print(f"  {result['content'][:100]}...")
    print()
```

With the query "container orchestration and scaling", the vector search will return the Kubernetes document as the top result because its meaning is closest, even though the exact words may not match.

## Step 5: Hybrid Search (Vector + Keyword)

Pure vector search is great, but hybrid search - combining vector and keyword results - often produces the best overall relevance. Azure AI Search makes this straightforward.

```python
# hybrid_query.py - Combine vector and keyword search
vector_query = VectorizedQuery(
    vector=get_embedding("deploy applications to production"),
    k_nearest_neighbors=5,
    fields="contentVector"
)

# Hybrid search: both text and vector in one query
results = search_client.search(
    search_text="deploy applications",  # Keyword component
    vector_queries=[vector_query],       # Vector component
    select=["id", "title", "content"],
    top=5
)

for result in results:
    print(f"Score: {result['@search.score']:.4f} | {result['title']}")
```

Azure AI Search uses Reciprocal Rank Fusion (RRF) to combine the keyword and vector result sets into a single ranked list. This gives you the precision of keyword search combined with the semantic understanding of vector search.

## Integrated Vectorization

If you want to skip the manual embedding generation step, Azure AI Search supports integrated vectorization. You can configure a skillset with a vectorization skill that automatically generates embeddings during indexing. At query time, the search service can also vectorize the query text for you.

This simplifies the architecture since your application does not need to call the OpenAI API directly. The search service handles it.

## Performance and Scaling Considerations

A few practical tips for production deployments:

1. **Choose the right dimensions** - text-embedding-3-small supports configurable dimensions. Fewer dimensions means faster search and less storage, but slightly lower accuracy.
2. **Batch your uploads** - when indexing large datasets, upload documents in batches of 100-1000 to avoid timeouts.
3. **Use filters with vector search** - pre-filtering reduces the number of vectors the search engine needs to compare, improving performance.
4. **Monitor index size** - vector fields consume significantly more storage than text fields. A 1536-dimension float vector takes about 6KB per document.

## Wrapping Up

Building a vector search index in Azure AI Search with OpenAI embeddings is a practical way to add semantic search capabilities to your applications. The combination of vector search for semantic understanding and keyword search for precision gives you the best of both worlds. Whether you are building a RAG application, a document search system, or an e-commerce product finder, vector search dramatically improves the quality of results your users see.
