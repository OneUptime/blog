# How to Generate Text Embeddings with Azure OpenAI for Semantic Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, Embeddings, Semantic Search, Vector Search, AI, NLP

Description: Learn how to generate text embeddings with Azure OpenAI and use them to build a semantic search system that understands meaning, not just keywords.

---

Traditional keyword search works by matching exact words in a query to words in your documents. It is fast and straightforward, but it fails when users describe what they are looking for using different words than what appears in the documents. Semantic search solves this by comparing the meaning of the query to the meaning of your documents. The bridge between text and meaning is an embedding - a numerical vector representation of text where similar meanings produce similar vectors.

Azure OpenAI provides embedding models that convert text into high-dimensional vectors. In this post, I will show you how to generate embeddings, store them, and use them for semantic search.

## What Are Text Embeddings?

An embedding is a list of floating-point numbers (a vector) that represents the semantic meaning of a piece of text. When you pass text to an embedding model, it returns a vector where:

- Texts with similar meanings have vectors that are close together in the vector space.
- Texts with different meanings have vectors that are far apart.

For example, the sentences "How do I reset my password?" and "I forgot my login credentials" would have very similar embeddings, even though they share almost no words. A keyword search for "reset password" would miss the second sentence entirely, but a vector search would find it.

Azure OpenAI's `text-embedding-ada-002` model produces 1536-dimensional vectors, while the newer `text-embedding-3-small` and `text-embedding-3-large` models offer different dimension options with improved performance.

## Step 1: Set Up Your Environment

You need an Azure OpenAI resource with an embedding model deployed. In Azure OpenAI Studio, create a deployment for one of the embedding models.

```bash
# Install the required packages
pip install openai numpy
```

```python
import openai
import numpy as np

# Initialize the Azure OpenAI client
client = openai.AzureOpenAI(
    api_key="your-api-key",
    api_version="2024-02-01",
    azure_endpoint="https://your-resource.openai.azure.com/"
)
```

## Step 2: Generate Embeddings

Generating an embedding is a single API call. You pass in text and get back a vector.

```python
def get_embedding(text, model="text-embedding-ada-002"):
    """
    Convert a text string into a vector embedding.
    The returned vector has 1536 dimensions for ada-002.
    """
    # Clean the text - remove newlines to avoid issues
    text = text.replace("\n", " ").strip()

    response = client.embeddings.create(
        model=model,  # This is your deployment name
        input=text
    )

    # The embedding is a list of 1536 floats
    return response.data[0].embedding


# Example usage
embedding = get_embedding("How do I configure a virtual network in Azure?")
print(f"Embedding dimensions: {len(embedding)}")
print(f"First 5 values: {embedding[:5]}")
```

You can also generate embeddings for multiple texts in a single API call, which is much more efficient for batch processing.

```python
def get_embeddings_batch(texts, model="text-embedding-ada-002"):
    """
    Generate embeddings for multiple texts in a single API call.
    This is significantly faster than making individual calls.
    """
    # Clean all texts
    cleaned = [t.replace("\n", " ").strip() for t in texts]

    response = client.embeddings.create(
        model=model,
        input=cleaned
    )

    # Return embeddings in the same order as input
    return [item.embedding for item in response.data]


# Generate embeddings for a batch of documents
documents = [
    "Azure Virtual Networks provide isolation and segmentation.",
    "Kubernetes clusters can be deployed with AKS.",
    "Blob storage is used for unstructured data.",
    "Azure SQL Database is a managed relational database."
]

embeddings = get_embeddings_batch(documents)
print(f"Generated {len(embeddings)} embeddings")
```

## Step 3: Measure Similarity Between Embeddings

The most common way to measure similarity between embedding vectors is cosine similarity. Two identical texts would have a cosine similarity of 1.0, while completely unrelated texts would be close to 0.

```python
def cosine_similarity(vec_a, vec_b):
    """
    Calculate the cosine similarity between two vectors.
    Returns a value between -1 and 1, where 1 means identical direction.
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# Compare the similarity of different sentences
query = "How do I store files in Azure?"
query_embedding = get_embedding(query)

for doc, doc_embedding in zip(documents, embeddings):
    similarity = cosine_similarity(query_embedding, doc_embedding)
    print(f"Similarity: {similarity:.4f} | {doc}")
```

Running this, you would see that "Blob storage is used for unstructured data" has the highest similarity to "How do I store files in Azure?" because the meanings are related, even though the words are quite different.

## Step 4: Build a Simple Semantic Search Engine

Let us put it all together into a working semantic search system. We will index a collection of documents and then search them using natural language queries.

```python
class SemanticSearch:
    """
    A simple semantic search engine using Azure OpenAI embeddings.
    Documents are stored in memory with their embeddings.
    """

    def __init__(self, client, model="text-embedding-ada-002"):
        self.client = client
        self.model = model
        self.documents = []      # Original document texts
        self.embeddings = []     # Corresponding embedding vectors
        self.metadata = []       # Optional metadata for each document

    def add_documents(self, docs, metadata_list=None):
        """
        Add documents to the search index.
        Each document is embedded and stored alongside its text.
        """
        # Generate embeddings for all documents at once
        new_embeddings = get_embeddings_batch(docs, self.model)

        self.documents.extend(docs)
        self.embeddings.extend(new_embeddings)

        if metadata_list:
            self.metadata.extend(metadata_list)
        else:
            self.metadata.extend([{}] * len(docs))

        print(f"Indexed {len(docs)} documents. Total: {len(self.documents)}")

    def search(self, query, top_k=5):
        """
        Search for documents similar to the query.
        Returns the top-k most similar documents with their similarity scores.
        """
        # Embed the query
        query_embedding = get_embedding(query, self.model)

        # Calculate similarity with all documents
        scores = []
        for i, doc_embedding in enumerate(self.embeddings):
            similarity = cosine_similarity(query_embedding, doc_embedding)
            scores.append((i, similarity))

        # Sort by similarity (highest first) and return top-k
        scores.sort(key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in scores[:top_k]:
            results.append({
                "document": self.documents[idx],
                "score": score,
                "metadata": self.metadata[idx]
            })
        return results


# Create the search engine and add documents
search_engine = SemanticSearch(client)

# Add a knowledge base about Azure services
knowledge_base = [
    "Azure Blob Storage is a service for storing large amounts of unstructured data like images, videos, and documents.",
    "Azure SQL Database is a fully managed relational database with built-in AI features.",
    "Azure Kubernetes Service (AKS) simplifies deploying and managing containerized applications.",
    "Azure Virtual Machines let you run Windows or Linux VMs in the cloud.",
    "Azure Functions is a serverless compute service for running event-driven code.",
    "Azure Cosmos DB is a globally distributed NoSQL database service.",
    "Azure Active Directory provides identity and access management for cloud applications.",
    "Azure DevOps provides developer services for build, test, and deployment pipelines.",
]

search_engine.add_documents(knowledge_base)

# Search with natural language
results = search_engine.search("Where should I put my Docker containers?")
for r in results[:3]:
    print(f"Score: {r['score']:.4f} | {r['document']}")
```

The query "Where should I put my Docker containers?" does not contain the word "Kubernetes" or "AKS," but the semantic search will still rank the AKS document highly because it understands that Docker containers and Kubernetes are related concepts.

## Choosing the Right Embedding Model

Azure OpenAI offers several embedding models:

| Model | Dimensions | Best For |
|-------|-----------|----------|
| text-embedding-ada-002 | 1536 | General purpose, good balance of quality and cost |
| text-embedding-3-small | 512-1536 | Cost-effective, configurable dimensions |
| text-embedding-3-large | 256-3072 | Highest quality, best for precision-critical use cases |

The newer text-embedding-3 models support configurable dimensions. You can request fewer dimensions to reduce storage costs and speed up similarity calculations at the expense of some accuracy.

## Scaling to Production

The in-memory approach above works for small datasets, but for production systems with millions of documents, you need a proper vector database. Options on Azure include:

- **Azure AI Search**: Native vector search support with hybrid (keyword + vector) search capabilities.
- **Azure Cosmos DB for MongoDB vCore**: Supports vector search with the IVF and HNSW indexing algorithms.
- **Azure Database for PostgreSQL**: Supports vector search through the pgvector extension.

Each of these services handles the indexing, storage, and efficient nearest-neighbor search that you would otherwise need to build yourself.

## Cost Considerations

Embedding generation is significantly cheaper than chat completions. The text-embedding-ada-002 model costs approximately $0.0001 per 1K tokens. Even embedding a million documents of 500 tokens each would only cost about $50. The bigger cost factor is usually the vector storage and search infrastructure, not the embedding generation itself.

## Wrapping Up

Text embeddings are the foundation of semantic search, and Azure OpenAI makes it straightforward to generate them. The key insight is that embeddings capture meaning rather than keywords, which makes search systems much more natural and forgiving. Start with a simple in-memory prototype to validate your approach, then move to a managed vector database like Azure AI Search for production. The difference between keyword search and semantic search is often the difference between a frustrating user experience and a delightful one.
