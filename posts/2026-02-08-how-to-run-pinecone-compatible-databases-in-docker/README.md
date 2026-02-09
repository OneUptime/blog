# How to Run Pinecone-Compatible Databases in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Vector Database, Pinecone, Qdrant, Weaviate, AI, DevOps

Description: Self-hosted Pinecone alternatives you can run in Docker for vector similarity search and AI applications

---

Pinecone is a managed vector database service popular for AI applications. But managed means vendor lock-in, usage-based pricing, and no option to run locally. Several open-source vector databases offer similar capabilities and can run in Docker containers on your own infrastructure. This guide covers the best Pinecone-compatible alternatives, how to run them in Docker, and how to migrate workflows between them.

## Why Self-Host a Vector Database?

Pinecone is convenient, but self-hosting gives you full control. You avoid per-query pricing, keep data in your own infrastructure, and can run everything locally during development. For companies with data residency requirements or cost sensitivity at scale, self-hosting is often the practical choice.

The three strongest Pinecone alternatives that run in Docker are Qdrant, Weaviate, and Chroma. Each takes a slightly different approach, but all store vectors and support similarity search.

## Qdrant - Closest to Pinecone's API Model

Qdrant is a Rust-based vector database with a REST and gRPC API. Its data model of collections, points, and payloads closely mirrors Pinecone's approach.

```yaml
# docker-compose-qdrant.yml
version: "3.8"

services:
  qdrant:
    image: qdrant/qdrant:v1.9.0
    container_name: qdrant
    ports:
      - "6333:6333"   # REST API
      - "6334:6334"   # gRPC API
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: 6334
    deploy:
      resources:
        limits:
          memory: 2G

volumes:
  qdrant_data:
```

```bash
docker compose -f docker-compose-qdrant.yml up -d
```

Create a collection and insert vectors using the REST API.

```bash
# Create a collection with cosine similarity
curl -X PUT http://localhost:6333/collections/documents \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Insert vectors with metadata (payload)
curl -X PUT http://localhost:6333/collections/documents/points \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "vector": [0.1, 0.2, 0.3, 0.4],
        "payload": {"title": "Docker fundamentals", "category": "devops"}
      },
      {
        "id": 2,
        "vector": [0.5, 0.6, 0.7, 0.8],
        "payload": {"title": "REST API design", "category": "backend"}
      }
    ]
  }'
```

Search with filtering.

```bash
# Search for similar vectors with a category filter
curl -X POST http://localhost:6333/collections/documents/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.35, 0.45],
    "limit": 5,
    "filter": {
      "must": [
        {"key": "category", "match": {"value": "devops"}}
      ]
    },
    "with_payload": true
  }'
```

Use the Python client for a more Pinecone-like experience.

```python
# pip install qdrant-client sentence-transformers
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

client = QdrantClient(host="localhost", port=6333)
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create collection (similar to Pinecone's create_index)
client.create_collection(
    collection_name="articles",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)

# Upsert vectors (same concept as Pinecone's upsert)
texts = [
    "Kubernetes cluster management",
    "Machine learning pipelines",
    "Database replication strategies",
]
embeddings = model.encode(texts)

points = [
    PointStruct(id=i, vector=emb.tolist(), payload={"text": text})
    for i, (text, emb) in enumerate(zip(texts, embeddings))
]
client.upsert(collection_name="articles", points=points)

# Query (similar to Pinecone's query)
query_vector = model.encode("container orchestration").tolist()
results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    limit=3
)
for result in results:
    print(f"Score: {result.score:.4f} - {result.payload['text']}")
```

## Weaviate - Schema-Driven Vector Database

Weaviate takes a more opinionated approach with a GraphQL API and built-in vectorization modules. It can generate embeddings automatically if you configure a vectorizer.

```yaml
# docker-compose-weaviate.yml
version: "3.8"

services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.25.0
    container_name: weaviate
    ports:
      - "8080:8080"   # REST API
      - "50051:50051"  # gRPC
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true"
      PERSISTENCE_DATA_PATH: "/var/lib/weaviate"
      DEFAULT_VECTORIZER_MODULE: "none"
      CLUSTER_HOSTNAME: "node1"
    volumes:
      - weaviate_data:/var/lib/weaviate
    deploy:
      resources:
        limits:
          memory: 2G

volumes:
  weaviate_data:
```

```bash
docker compose -f docker-compose-weaviate.yml up -d
```

Work with Weaviate using the Python client.

```python
# pip install weaviate-client
import weaviate
import weaviate.classes as wvc

# Connect to Weaviate
client = weaviate.connect_to_local()

# Create a collection (class in Weaviate terminology)
collection = client.collections.create(
    name="Article",
    vectorizer_config=wvc.config.Configure.Vectorizer.none(),
    properties=[
        wvc.config.Property(name="title", data_type=wvc.config.DataType.TEXT),
        wvc.config.Property(name="category", data_type=wvc.config.DataType.TEXT),
    ]
)

# Insert objects with pre-computed vectors
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")

articles = [
    {"title": "Docker networking deep dive", "category": "devops"},
    {"title": "Building a search engine", "category": "backend"},
    {"title": "GPU acceleration for ML", "category": "ml"},
]

with collection.batch.dynamic() as batch:
    for article in articles:
        vector = model.encode(article["title"]).tolist()
        batch.add_object(properties=article, vector=vector)

# Search by vector
query_vector = model.encode("container networking").tolist()
results = collection.query.near_vector(
    near_vector=query_vector,
    limit=3,
    return_metadata=wvc.query.MetadataQuery(distance=True)
)

for obj in results.objects:
    print(f"Distance: {obj.metadata.distance:.4f} - {obj.properties['title']}")

client.close()
```

## Side-by-Side Comparison

Here is how these alternatives compare to Pinecone.

| Feature | Pinecone | Qdrant | Weaviate |
|---------|----------|--------|----------|
| Hosting | Managed only | Self-hosted + Cloud | Self-hosted + Cloud |
| API style | REST/gRPC | REST/gRPC | REST/GraphQL/gRPC |
| Filtering | Metadata filters | Payload filters | Property filters |
| Built-in vectorizers | No | No | Yes (optional modules) |
| Languages | Python, JS, Go | Python, JS, Rust, Go | Python, JS, Go, Java |
| Pricing | Per query + storage | Free (self-hosted) | Free (self-hosted) |
| Persistence | Managed | Disk-based | Disk-based |

## Migration Pattern: Pinecone to Qdrant

If you have an existing Pinecone application, migrating to Qdrant is straightforward because the concepts map closely.

```python
# migration.py - Migrate from Pinecone to Qdrant
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import pinecone

# Source: Pinecone
pinecone.init(api_key="your-pinecone-key", environment="us-east1-gcp")
pinecone_index = pinecone.Index("source-index")

# Target: Qdrant
qdrant = QdrantClient(host="localhost", port=6333)
qdrant.create_collection(
    collection_name="migrated-index",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)

# Fetch and migrate in batches
batch_size = 100
vector_ids = []  # Collect your IDs from your application

for i in range(0, len(vector_ids), batch_size):
    batch_ids = vector_ids[i:i + batch_size]

    # Fetch from Pinecone
    fetched = pinecone_index.fetch(ids=batch_ids)

    # Convert and upsert to Qdrant
    points = []
    for vid, data in fetched["vectors"].items():
        points.append(PointStruct(
            id=hash(vid) % (2**63),  # Convert string ID to int
            vector=data["values"],
            payload=data.get("metadata", {})
        ))

    qdrant.upsert(collection_name="migrated-index", points=points)
    print(f"Migrated batch {i // batch_size + 1}")
```

## Production Considerations

When running vector databases in Docker for production, keep these points in mind.

Memory is critical. Vector indexes live in RAM for fast search. Monitor memory usage closely and set container memory limits above your expected index size.

```bash
# Monitor memory usage across your vector database containers
docker stats qdrant --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

Use persistent volumes to survive container restarts.

```bash
# Verify data persists across restarts
docker compose restart qdrant
curl http://localhost:6333/collections/documents
```

## Summary

You do not need Pinecone to build production vector search. Qdrant, Weaviate, and Chroma all run in Docker and provide similar capabilities. Qdrant is the closest match to Pinecone's API model, with collections, points, and payload filtering. Weaviate adds schema-driven design and optional built-in vectorizers. Choose based on your API preferences and deployment requirements. All three support the core workflow of storing embeddings, building indexes, and performing filtered similarity search.
