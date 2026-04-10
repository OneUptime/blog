# Redis vs Milvus for Vector Similarity Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Milvus, Vector Search, Similarity Search, AI

Description: Compare Redis and Milvus for vector similarity search, covering index types, scalability, GPU support, and production deployment considerations.

---

## Overview

Milvus is an open-source vector database purpose-built for billion-scale similarity search. Redis Stack provides vector search via HNSW and flat indexes. This comparison helps you decide which tool fits your scale and operational requirements.

## Milvus Architecture

Milvus uses a disaggregated architecture with separate storage, query, and index nodes, designed for horizontal scaling.

```python
from pymilvus import MilvusClient, DataType

client = MilvusClient(uri="http://localhost:19530")

# Create a collection schema
schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=True)
schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
schema.add_field(field_name="content", datatype=DataType.VARCHAR, max_length=512)
schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=1536)

# Create the collection
client.create_collection(
    collection_name="articles",
    schema=schema
)

# Create an HNSW index
index_params = MilvusClient.prepare_index_params()
index_params.add_index(
    field_name="embedding",
    index_type="HNSW",
    metric_type="COSINE",
    params={"M": 16, "efConstruction": 200}
)
client.create_index("articles", index_params)
```

## Redis Vector Search Setup

```python
import redis
import numpy as np

r = redis.Redis()

# Create index with HNSW
r.execute_command(
    "FT.CREATE", "idx:articles",
    "ON", "HASH",
    "PREFIX", "1", "article:",
    "SCHEMA",
    "content", "TEXT",
    "embedding", "VECTOR", "HNSW", "6",
    "TYPE", "FLOAT32",
    "DIM", "1536",
    "DISTANCE_METRIC", "COSINE"
)
```

## Supported Index Types

Milvus supports a wider range of index algorithms:

```python
# Milvus IVF_FLAT - inverted file, good balance
index_params.add_index(
    field_name="embedding",
    index_type="IVF_FLAT",
    metric_type="L2",
    params={"nlist": 1024}
)

# Milvus IVF_SQ8 - quantized, 4x smaller
index_params.add_index(
    field_name="embedding",
    index_type="IVF_SQ8",
    metric_type="L2",
    params={"nlist": 1024}
)

# Milvus DISKANN - disk-based for huge datasets
index_params.add_index(
    field_name="embedding",
    index_type="DISKANN",
    metric_type="L2"
)

# Milvus GPU_IVF_FLAT - GPU-accelerated
index_params.add_index(
    field_name="embedding",
    index_type="GPU_IVF_FLAT",
    metric_type="L2",
    params={"nlist": 1024}
)
```

Redis supports HNSW, FLAT (exact search), and SVS-VAMANA (graph-based ANN with built-in compression, available since Redis 8.2) indexes.

## Inserting and Querying

```python
# Milvus insert
data = [
    {"id": 1, "content": "Redis in-memory data store", "embedding": [0.1] * 1536},
    {"id": 2, "content": "Milvus vector database", "embedding": [0.2] * 1536},
]
client.insert(collection_name="articles", data=data)

# Milvus search
results = client.search(
    collection_name="articles",
    data=[[0.1] * 1536],
    anns_field="embedding",
    search_params={"metric_type": "COSINE", "params": {"ef": 100}},
    limit=5,
    output_fields=["content"]
)
```

```python
# Redis insert
r.hset("article:1", mapping={
    "content": "Redis in-memory data store",
    "embedding": np.array([0.1] * 1536, dtype=np.float32).tobytes()
})

# Redis search
query_vec = np.array([0.1] * 1536, dtype=np.float32).tobytes()
results = r.ft("idx:articles").search(
    "*=>[KNN 5 @embedding $vec AS score]",
    query_params={"vec": query_vec}
)
```

## Partition and Collection Management

Milvus supports partitioning within collections for multi-tenancy and filtered searches:

```python
# Create partitions
client.create_partition("articles", partition_name="en")
client.create_partition("articles", partition_name="es")

# Insert into specific partition
client.insert("articles", data=en_data, partition_name="en")

# Search only in specific partitions
results = client.search(
    collection_name="articles",
    partition_names=["en"],
    data=[query_vec],
    anns_field="embedding",
    limit=10
)
```

## Scalability Comparison

```text
Scale          | Redis Vector Search     | Milvus
---------------|-------------------------|---------------------------
Vectors        | ~100M (RAM limited)     | Billions (DiskANN, cloud)
Index types    | HNSW, FLAT, SVS-VAMANA  | 10+ (IVF, HNSW, DiskANN, GPU)
GPU support    | No                      | Yes (GPU indexes)
Sharding       | Redis Cluster (limited) | Native distributed
Persistence    | AOF/RDB snapshots       | S3/MinIO object storage
```

## Operational Comparison

```bash
# Deploy Redis Stack with Docker
docker run -d --name redis-stack \
  -p 6379:6379 -p 8001:8001 \
  redis/redis-stack:latest

# Deploy Milvus standalone with Docker Compose
curl -sfL https://raw.githubusercontent.com/milvus-io/milvus/master/scripts/standalone_embed.sh | bash
```

Milvus has more components (etcd, MinIO, proxy, query nodes) compared to Redis's single-process simplicity.

## When to Use Redis

- Your dataset fits in RAM (under ~100M vectors for typical dimensions)
- You need sub-millisecond latency and already run Redis
- You want minimal infrastructure and operational overhead
- Vector search is secondary to other Redis use cases (caching, pub/sub)

## When to Use Milvus

- You need to scale to hundreds of millions or billions of vectors
- You need GPU-accelerated indexing and search
- You need advanced index types (IVF, DiskANN, quantization)
- You want cloud-native distributed vector storage with S3 backends

## Summary

Milvus is the better choice for production-scale AI applications requiring billions of vectors, GPU acceleration, and distributed architecture. Redis provides simpler deployment and ultra-low latency for moderate-scale vector search when the dataset fits in memory. Start with Redis for prototypes and small-to-medium scales, and graduate to Milvus when your vector dataset outgrows available RAM.
