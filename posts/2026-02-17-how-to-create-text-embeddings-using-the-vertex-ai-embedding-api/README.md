# How to Create Text Embeddings Using the Vertex AI Embedding API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Embeddings, NLP, Semantic Search

Description: Learn how to generate text embeddings using the Vertex AI Embedding API for semantic search, clustering, and similarity applications.

---

Text embeddings are one of those behind-the-scenes technologies that power a huge number of applications. When you search for something and get results that match the meaning of your query rather than just the exact words, embeddings are doing the heavy lifting. They convert text into numerical vectors that capture semantic meaning, so similar texts end up close together in vector space. The Vertex AI Embedding API gives you access to Google's embedding models, making it easy to add semantic understanding to your applications.

## What Are Text Embeddings

An embedding is a list of floating-point numbers (a vector) that represents the meaning of a piece of text. Two texts with similar meanings will have similar vectors, even if they use completely different words. For example, "How do I restart my server?" and "Steps to reboot a machine" would have very similar embeddings, even though they share few words.

These vectors are typically 768 dimensions, meaning each text is represented by a list of 768 numbers. The relationships between these numbers encode the semantic meaning.

## Getting Started

Install the Vertex AI SDK:

```bash
# Install the SDK
pip install google-cloud-aiplatform
```

## Generating Your First Embedding

Here is the simplest way to create a text embedding:

```python
# first_embedding.py
# Generate a text embedding using Vertex AI

import vertexai
from vertexai.language_models import TextEmbeddingModel

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Load the embedding model
model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# Generate an embedding for a single text
embeddings = model.get_embeddings(['What is cloud computing?'])

# The result is a vector of floating-point numbers
embedding_vector = embeddings[0].values
print(f"Embedding dimension: {len(embedding_vector)}")
print(f"First 10 values: {embedding_vector[:10]}")
```

## Generating Embeddings for Multiple Texts

You can embed multiple texts in a single API call, which is much more efficient than making individual calls:

```python
# batch_embeddings.py
# Generate embeddings for multiple texts at once

import vertexai
from vertexai.language_models import TextEmbeddingModel

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# Embed multiple texts in one call
texts = [
    'How to set up a load balancer on GCP',
    'Configuring autoscaling for GKE clusters',
    'Best practices for Cloud SQL backups',
    'Monitoring Kubernetes pods with Cloud Monitoring',
    'Setting up VPN between on-premises and GCP',
]

embeddings = model.get_embeddings(texts)

# Each text gets its own embedding vector
for text, embedding in zip(texts, embeddings):
    print(f"Text: {text[:50]}...")
    print(f"  Dimension: {len(embedding.values)}")
    print(f"  First 5 values: {embedding.values[:5]}")
    print()
```

## Using Task Types

The embedding model supports different task types that optimize the embeddings for specific use cases:

```python
# task_types.py
# Use task types to optimize embeddings for specific use cases

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# For semantic search - embed the query differently from documents
query_input = TextEmbeddingInput(
    text='how to fix connection timeout errors',
    task_type='RETRIEVAL_QUERY',
)

document_inputs = [
    TextEmbeddingInput(
        text='Connection timeout errors occur when a client cannot establish a connection to the server within the specified time limit. Common causes include network issues, firewall rules blocking traffic, and server overload.',
        task_type='RETRIEVAL_DOCUMENT',
    ),
    TextEmbeddingInput(
        text='To resolve DNS resolution failures, check your Cloud DNS configuration and ensure the domain records are correctly pointing to your instances.',
        task_type='RETRIEVAL_DOCUMENT',
    ),
]

# Generate embeddings with task types
query_embedding = model.get_embeddings([query_input])
doc_embeddings = model.get_embeddings(document_inputs)

print(f"Query embedding: {len(query_embedding[0].values)} dimensions")
print(f"Document embeddings: {len(doc_embeddings)} documents")
```

The available task types are:
- `RETRIEVAL_QUERY` - For search queries
- `RETRIEVAL_DOCUMENT` - For documents being searched
- `SEMANTIC_SIMILARITY` - For comparing text similarity
- `CLASSIFICATION` - For text classification tasks
- `CLUSTERING` - For grouping similar texts

## Computing Similarity Between Texts

Once you have embeddings, you can compute cosine similarity to find how similar two texts are:

```python
# similarity.py
# Compute similarity between text embeddings

import vertexai
from vertexai.language_models import TextEmbeddingModel
import numpy as np

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

def cosine_similarity(vec_a, vec_b):
    """Compute cosine similarity between two vectors."""
    dot_product = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    return dot_product / (norm_a * norm_b)

# Compare several text pairs
text_pairs = [
    ('How to deploy a container on GKE', 'Steps to run Docker images on Google Kubernetes Engine'),
    ('How to deploy a container on GKE', 'Best recipes for chocolate cake'),
    ('Python is a programming language', 'Python is a type of snake'),
]

for text_a, text_b in text_pairs:
    embeddings = model.get_embeddings([text_a, text_b])
    vec_a = np.array(embeddings[0].values)
    vec_b = np.array(embeddings[1].values)

    similarity = cosine_similarity(vec_a, vec_b)
    print(f"Similarity: {similarity:.4f}")
    print(f"  A: {text_a}")
    print(f"  B: {text_b}")
    print()
```

## Building a Simple Semantic Search

Here is a complete semantic search implementation:

```python
# semantic_search.py
# Simple semantic search using Vertex AI embeddings

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
import numpy as np

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# Your knowledge base
documents = [
    'To restart a Cloud SQL instance, go to the Cloud Console, find your instance, and click Restart.',
    'GKE node pools can be resized by updating the node count in the cluster settings.',
    'Cloud Storage lifecycle rules can automatically delete objects older than a specified age.',
    'To enable HTTPS on a load balancer, you need to create an SSL certificate and attach it.',
    'VPC firewall rules control incoming and outgoing traffic to your VM instances.',
    'Cloud Functions can be triggered by HTTP requests, Pub/Sub messages, or Cloud Storage events.',
    'BigQuery supports standard SQL and can process petabytes of data in seconds.',
    'IAM roles should follow the principle of least privilege for security.',
]

# Embed all documents
doc_inputs = [
    TextEmbeddingInput(text=doc, task_type='RETRIEVAL_DOCUMENT')
    for doc in documents
]
doc_embeddings = model.get_embeddings(doc_inputs)
doc_vectors = np.array([e.values for e in doc_embeddings])

def search(query, top_k=3):
    """Search the knowledge base with a natural language query."""
    # Embed the query
    query_input = TextEmbeddingInput(text=query, task_type='RETRIEVAL_QUERY')
    query_embedding = model.get_embeddings([query_input])
    query_vector = np.array(query_embedding[0].values)

    # Compute similarities
    similarities = np.dot(doc_vectors, query_vector) / (
        np.linalg.norm(doc_vectors, axis=1) * np.linalg.norm(query_vector)
    )

    # Get top-k results
    top_indices = np.argsort(similarities)[::-1][:top_k]

    print(f"\nQuery: {query}")
    print("-" * 60)
    for i, idx in enumerate(top_indices):
        print(f"{i+1}. [{similarities[idx]:.4f}] {documents[idx]}")

# Try some queries
search('How do I set up SSL for my website?')
search('How can I delete old files automatically?')
search('What is the best way to manage access control?')
```

## Handling Large Batches

The API has limits on batch size. For large datasets, process in chunks:

```python
# large_batch.py
# Process large numbers of texts in batches

import vertexai
from vertexai.language_models import TextEmbeddingModel
import numpy as np

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

def embed_in_batches(texts, batch_size=250):
    """Embed a large list of texts in batches."""
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"Processing batch {i // batch_size + 1} ({len(batch)} texts)")

        embeddings = model.get_embeddings(batch)
        all_embeddings.extend([e.values for e in embeddings])

    return np.array(all_embeddings)

# Example with a large list
large_text_list = [f"Document number {i} with some content about topic {i % 10}" for i in range(1000)]
vectors = embed_in_batches(large_text_list)
print(f"Generated {vectors.shape[0]} embeddings of dimension {vectors.shape[1]}")
```

## Choosing the Right Model

Vertex AI offers several embedding models:

- **text-embedding-005** - Latest model, best overall performance
- **text-embedding-004** - Previous generation, still widely used
- **text-multilingual-embedding-002** - Supports 100+ languages

For English-only applications, use `text-embedding-005`. For multilingual applications, use `text-multilingual-embedding-002`.

## Wrapping Up

The Vertex AI Embedding API gives you access to high-quality text embeddings that power semantic search, similarity computation, clustering, and classification. The key concepts are simple: convert text to vectors, compare vectors to find similar texts. Use task types to optimize for your specific use case, batch your requests for efficiency, and consider using Vertex AI Vector Search for production-scale similarity search. Start with a small prototype, verify the embeddings capture the relationships you care about, and then scale up.
