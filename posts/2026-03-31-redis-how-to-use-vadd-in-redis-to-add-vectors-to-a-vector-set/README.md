# How to Use VADD in Redis to Add Vectors to a Vector Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Embedding, Similarity Search, Machine Learning

Description: Learn how to use VADD in Redis to store vector embeddings in a vector set for efficient similarity search and nearest neighbor lookups.

---

## What Is VADD?

`VADD` is a Redis command introduced in Redis 8.0 for adding vector embeddings to a Vector Set. Vector Sets are a native Redis data type designed for storing and querying high-dimensional vectors, enabling semantic search, recommendation systems, and similarity matching.

Each vector is associated with an element name (like a key), and you can later use `VSIM` to find the most similar vectors.

## Prerequisites

- Redis 8.0 or later (Vector Sets are a native type in Redis 8+)
- Vector embeddings from a model such as OpenAI, Sentence Transformers, etc.

## Syntax

```text
VADD key [REDUCE dim] (FP32 | VALUES num) vector element [CAS] [NOQUANT | Q8 | BIN]
  [EF build-exploration-factor] [SETATTR attributes] [M numlinks]
```

Key parameters:
- `key` - the Vector Set name
- `FP32 vector` - the embedding as a binary blob of 32-bit floats
- `VALUES num vector` - the embedding as `num` floating point numbers
- `element` - a unique label for the vector (specified after the vector data)

## Basic Usage

```bash
# Add a 4-dimensional vector for element "doc1"
VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 doc1

# Add another vector
VADD my_vectors VALUES 4 0.5 0.6 0.7 0.8 doc2

# Add a third
VADD my_vectors VALUES 4 0.15 0.25 0.35 0.45 doc3
```

## Adding Real Embeddings

In practice, vectors come from embedding models:

```python
import redis
import numpy as np

r = redis.Redis(host="localhost", port=6379, decode_responses=False)

# Simulate embedding model output (e.g., from sentence-transformers)
# Real embeddings are typically 384, 768, or 1536 dimensions
def mock_embed(text: str, dims: int = 8) -> list:
    """Mock embedding function - replace with real model."""
    np.random.seed(hash(text) % 2**32)
    vec = np.random.randn(dims).astype(np.float32)
    vec = vec / np.linalg.norm(vec)  # Normalize
    return vec.tolist()

# Documents to index
documents = {
    "doc:redis-intro": "Introduction to Redis key-value store",
    "doc:redis-cluster": "Redis Cluster sharding and replication",
    "doc:python-basics": "Python programming for beginners",
    "doc:ml-overview": "Machine learning overview and concepts"
}

dim = 8
for doc_id, text in documents.items():
    embedding = mock_embed(text, dim)
    # Build the VADD command
    cmd = ["VADD", "docs:vectors", "VALUES", str(dim)] + [str(v) for v in embedding] + [doc_id]
    r.execute_command(*cmd)
    print(f"Added vector for: {doc_id}")

print(f"Total vectors: {r.execute_command('VCARD', 'docs:vectors')}")
```

## Using Quantization Options

Control the storage quantization to trade accuracy for memory:

```bash
# Default quantization (Q8 - signed 8-bit, good balance)
VADD vectors:q8 VALUES 4 0.1 0.2 0.3 0.4 element1

# No quantization (highest accuracy, most memory)
VADD vectors:exact VALUES 4 0.1 0.2 0.3 0.4 element1 NOQUANT

# Binary quantization (fastest, least memory, lower recall)
VADD vectors:bin VALUES 4 0.1 0.2 0.3 0.4 element1 BIN
```

## Checking If a Vector Already Exists

VADD replaces the existing vector if the element name already exists:

```bash
# First add
VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 user:1
# Returns: (integer) 1 - new element added

# Update (same element, new vector)
VADD my_vectors VALUES 4 0.9 0.8 0.7 0.6 user:1
# Returns: (integer) 0 - element updated, not new
```

## Building a Product Recommendation Store

```python
def build_product_vector_store(products: list, r, key: str, dim: int):
    """Store product embeddings for similarity search."""
    for product in products:
        embedding = mock_embed(product["description"], dim)
        cmd = (
            ["VADD", key, "VALUES", str(dim)]
            + [str(v) for v in embedding]
            + [product["id"]]
        )
        r.execute_command(*cmd)

    count = r.execute_command("VCARD", key)
    print(f"Stored {count} product vectors in '{key}'")

products = [
    {"id": "prod:1001", "description": "wireless bluetooth headphones noise canceling"},
    {"id": "prod:1002", "description": "over-ear wired studio monitor headphones"},
    {"id": "prod:1003", "description": "ergonomic mechanical keyboard backlit"},
    {"id": "prod:1004", "description": "compact wireless keyboard for tablets"},
]

build_product_vector_store(products, r, "products:vectors", dim=8)
```

## Setting Attributes with SETATTR

You can attach metadata to a vector at insert time:

```bash
# Add vector with JSON attribute
VADD items VALUES 4 0.1 0.2 0.3 0.4 user:1001 SETATTR '{"name":"Alice","age":30}'
```

## Summary

`VADD` stores vector embeddings in a Redis Vector Set, enabling fast approximate nearest-neighbor search with `VSIM`. Each vector is identified by an element name and can be updated by re-adding with the same name. Choose between Q8 (default), NOQUANT, or BIN quantization to balance memory and accuracy. Vector Sets are natively supported in Redis 8.0 and are designed for real-time semantic search and recommendation pipelines.
