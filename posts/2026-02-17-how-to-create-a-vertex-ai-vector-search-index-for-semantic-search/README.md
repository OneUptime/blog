# How to Create a Vertex AI Vector Search Index for Semantic Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Vector Search, Semantic Search, Embeddings

Description: Learn how to create and deploy a Vertex AI Vector Search index for building scalable semantic search applications on Google Cloud.

---

Traditional keyword search breaks down when users search for concepts rather than exact terms. Someone searching for "how to fix slow database queries" should find articles about query optimization, indexing strategies, and execution plan analysis, even if those articles do not contain the exact phrase "slow database queries." Semantic search uses vector embeddings to match by meaning rather than keywords, and Vertex AI Vector Search provides the infrastructure to do this at scale - from thousands to billions of vectors with sub-second query times.

## How Vector Search Works

The idea is simple. You convert your documents (or any data) into numerical vectors using an embedding model. These vectors capture the semantic meaning of the content. You store these vectors in an index. When a user searches, you convert their query into a vector and find the closest vectors in the index. The closest vectors correspond to the most semantically similar documents.

Vertex AI Vector Search (formerly Matching Engine) is Google's managed service for this. It handles the index building, sharding, and low-latency nearest neighbor search.

## Step 1: Generate Embeddings

First, you need embeddings for your content. Let us use the Vertex AI embedding model:

```python
# generate_embeddings.py
# Generate embeddings for your documents

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
import json

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# Your documents to index
documents = [
    {'id': '1', 'title': 'Setting Up Cloud SQL', 'content': 'Cloud SQL is a fully managed relational database service...'},
    {'id': '2', 'title': 'GKE Autoscaling Guide', 'content': 'Horizontal pod autoscaling in GKE automatically adjusts...'},
    {'id': '3', 'title': 'VPC Network Design', 'content': 'Designing a VPC network on Google Cloud requires planning...'},
    # ... hundreds or thousands more
]

# Generate embeddings for all documents
vectors = []
batch_size = 250

for i in range(0, len(documents), batch_size):
    batch = documents[i:i + batch_size]

    # Create embedding inputs with the retrieval document task type
    inputs = [
        TextEmbeddingInput(
            text=f"{doc['title']}. {doc['content']}",
            task_type='RETRIEVAL_DOCUMENT',
        )
        for doc in batch
    ]

    embeddings = model.get_embeddings(inputs)

    for doc, embedding in zip(batch, embeddings):
        vectors.append({
            'id': doc['id'],
            'embedding': embedding.values,
        })

    print(f"Processed {min(i + batch_size, len(documents))}/{len(documents)} documents")

print(f"Generated {len(vectors)} embeddings")
```

## Step 2: Prepare the Vector Data

Vector Search expects data in a specific JSONL format:

```python
# prepare_vectors.py
# Format vectors for Vector Search ingestion

import json

# Write vectors in the format Vector Search expects
# Each line: {"id": "unique_id", "embedding": [0.1, 0.2, ...]}
with open('vectors.jsonl', 'w') as f:
    for vec in vectors:
        record = {
            'id': vec['id'],
            'embedding': vec['embedding'],
        }
        f.write(json.dumps(record) + '\n')

print(f"Wrote {len(vectors)} vectors to vectors.jsonl")
```

Upload to Cloud Storage:

```bash
# Upload the vector data to GCS
gsutil cp vectors.jsonl gs://your-bucket/vector-search/vectors/vectors.jsonl
```

## Step 3: Create the Index

Now create a Vector Search index:

```python
# create_index.py
# Create a Vertex AI Vector Search index

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the index using the tree-AH algorithm
# Tree-AH is good for large-scale, high-recall approximate nearest neighbor search
index = aiplatform.MatchingEngineIndex.create_tree_ah_index(
    display_name='documentation-search-index',
    # Match your embedding model's output dimension
    dimensions=768,
    # Number of approximate neighbors to find
    approximate_neighbors_count=150,
    # How to measure distance between vectors
    distance_measure_type='DOT_PRODUCT_DISTANCE',
    # Path to your vector data in GCS
    contents_delta_uri='gs://your-bucket/vector-search/vectors/',
    description='Semantic search index for product documentation',
    # Optional: add labels for organization
    labels={'team': 'search', 'env': 'production'},
)

print(f"Index created: {index.resource_name}")
print(f"Index name: {index.name}")
```

The available distance measures are:
- `DOT_PRODUCT_DISTANCE` - Best for normalized vectors (like those from text-embedding-005)
- `SQUARED_L2_DISTANCE` - Euclidean distance squared
- `COSINE_DISTANCE` - Cosine similarity (if vectors are not normalized)

## Step 4: Create an Index Endpoint

The index endpoint is the serving infrastructure that handles queries:

```python
# create_endpoint.py
# Create a Vector Search index endpoint

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create a public endpoint (accessible via the internet)
index_endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
    display_name='doc-search-endpoint',
    description='Endpoint for documentation semantic search',
    public_endpoint_enabled=True,
)

print(f"Endpoint created: {index_endpoint.resource_name}")
```

For private endpoints within a VPC:

```python
# Create a VPC-private endpoint
index_endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
    display_name='doc-search-private-endpoint',
    network='projects/your-project-id/global/networks/your-vpc',
)
```

## Step 5: Deploy the Index

Connect the index to the endpoint:

```python
# deploy_index.py
# Deploy the index to the endpoint for querying

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

index = aiplatform.MatchingEngineIndex('INDEX_RESOURCE_NAME')
index_endpoint = aiplatform.MatchingEngineIndexEndpoint('ENDPOINT_RESOURCE_NAME')

# Deploy the index
index_endpoint.deploy_index(
    index=index,
    deployed_index_id='doc-search-v1',
    display_name='Documentation Search v1',
    # Machine type for serving
    machine_type='e2-standard-2',
    # Autoscaling configuration
    min_replica_count=1,
    max_replica_count=5,
)

print("Index deployed successfully")
```

This deployment can take 20-30 minutes to complete.

## Step 6: Query the Index

Now you can search:

```python
# search.py
# Perform semantic search queries

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from google.cloud import aiplatform

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Initialize the embedding model for query encoding
embedding_model = TextEmbeddingModel.from_pretrained('text-embedding-005')

# Get the deployed index endpoint
index_endpoint = aiplatform.MatchingEngineIndexEndpoint('ENDPOINT_RESOURCE_NAME')

def semantic_search(query, num_results=10):
    """Perform a semantic search against the index."""
    # Step 1: Embed the query
    query_input = TextEmbeddingInput(
        text=query,
        task_type='RETRIEVAL_QUERY',
    )
    query_embedding = embedding_model.get_embeddings([query_input])
    query_vector = query_embedding[0].values

    # Step 2: Find nearest neighbors
    results = index_endpoint.find_neighbors(
        deployed_index_id='doc-search-v1',
        queries=[query_vector],
        num_neighbors=num_results,
    )

    # Step 3: Return results
    matches = []
    for match in results[0]:
        matches.append({
            'id': match.id,
            'distance': match.distance,
        })

    return matches

# Try some searches
queries = [
    'how to optimize database query performance',
    'setting up network security for cloud resources',
    'autoscaling containers based on traffic',
]

for query in queries:
    print(f"\nQuery: {query}")
    results = semantic_search(query, num_results=5)
    for i, result in enumerate(results):
        print(f"  {i+1}. ID: {result['id']}, Distance: {result['distance']:.4f}")
```

## Updating the Index

When you add new documents, update the index:

```python
# update_index.py
# Add new vectors to an existing index

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

index = aiplatform.MatchingEngineIndex('INDEX_RESOURCE_NAME')

# Upload new vectors to a delta file in GCS
# Same JSONL format as the initial data
# Then update the index

index = index.update_embeddings(
    contents_delta_uri='gs://your-bucket/vector-search/updates/',
)

print(f"Index update started: {index.resource_name}")
```

You can also remove vectors:

```python
# Remove vectors by creating a file with IDs to remove
# Format: one ID per line in a text file
# Upload to GCS and reference in the update

index = index.update_embeddings(
    contents_delta_uri='gs://your-bucket/vector-search/updates/',
    is_complete_overwrite=False,  # Delta update, not full rebuild
)
```

## Using Filtering with Restricts

You can add metadata filters to narrow search results:

```python
# filtered_search.py
# Search with metadata filters

# When preparing vectors, add restricts
vector_with_restricts = {
    'id': 'doc_123',
    'embedding': [0.1, 0.2, ...],
    'restricts': [
        {
            'namespace': 'category',
            'allow_list': ['networking'],
        },
        {
            'namespace': 'language',
            'allow_list': ['python'],
        },
    ],
}

# When searching, apply filters
from google.cloud.aiplatform.matching_engine.matching_engine_index_endpoint import Namespace

results = index_endpoint.find_neighbors(
    deployed_index_id='doc-search-v1',
    queries=[query_vector],
    num_neighbors=10,
    # Only return results in the 'networking' category
    filter=[Namespace(name='category', allow_tokens=['networking'])],
)
```

## Building a Complete Search Service

Here is a Flask service that wraps everything together:

```python
# search_service.py
# Complete semantic search API service

from flask import Flask, request, jsonify
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from google.cloud import aiplatform

app = Flask(__name__)

# Initialize once at startup
vertexai.init(project='your-project-id', location='us-central1')
embedding_model = TextEmbeddingModel.from_pretrained('text-embedding-005')
index_endpoint = aiplatform.MatchingEngineIndexEndpoint('ENDPOINT_RESOURCE_NAME')

# In production, load document metadata from a database
# This maps vector IDs back to document content
document_store = {
    '1': {'title': 'Setting Up Cloud SQL', 'url': '/docs/cloud-sql-setup'},
    '2': {'title': 'GKE Autoscaling Guide', 'url': '/docs/gke-autoscaling'},
    '3': {'title': 'VPC Network Design', 'url': '/docs/vpc-design'},
}

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query', '')
    num_results = data.get('num_results', 10)

    if not query:
        return jsonify({'error': 'query is required'}), 400

    # Embed the query
    query_input = TextEmbeddingInput(text=query, task_type='RETRIEVAL_QUERY')
    query_embedding = embedding_model.get_embeddings([query_input])
    query_vector = query_embedding[0].values

    # Search the index
    results = index_endpoint.find_neighbors(
        deployed_index_id='doc-search-v1',
        queries=[query_vector],
        num_neighbors=num_results,
    )

    # Enrich results with document metadata
    search_results = []
    for match in results[0]:
        doc_meta = document_store.get(match.id, {})
        search_results.append({
            'id': match.id,
            'score': match.distance,
            'title': doc_meta.get('title', 'Unknown'),
            'url': doc_meta.get('url', ''),
        })

    return jsonify({'results': search_results, 'query': query})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Cost and Performance Considerations

Index creation cost depends on the number of vectors and their dimensions. The biggest ongoing cost is the deployed index endpoint, which runs on dedicated machines.

For development and testing, use a small machine type (e2-standard-2) with 1 replica. For production, scale up based on your query throughput requirements.

Keep your embedding dimensions reasonable. 768 dimensions (the default for text-embedding-005) works well. Higher dimensions increase storage and query costs.

## Wrapping Up

Vertex AI Vector Search gives you the infrastructure to build semantic search at any scale. The workflow is: embed your content, create an index, deploy it to an endpoint, and query it. The combination of Google's embedding models and Vector Search provides a powerful foundation for search applications, recommendation systems, and RAG pipelines. Start small with a few thousand vectors, verify the search quality meets your needs, and then scale up to production volumes.
