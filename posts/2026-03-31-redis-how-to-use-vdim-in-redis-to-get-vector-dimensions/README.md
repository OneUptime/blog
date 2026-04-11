# How to Use VDIM in Redis to Get Vector Dimensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Embedding, Dimension, Index Management

Description: Learn how to use VDIM in Redis to retrieve the dimensionality of vectors stored in a Vector Set, which is essential for compatibility validation.

---

## What Is VDIM?

`VDIM` returns the number of dimensions of the vectors stored in a Redis Vector Set. All vectors in a Vector Set must have the same number of dimensions, so VDIM tells you what that dimension is.

This is useful for validating that a new embedding model is compatible with an existing vector index before adding new vectors, or for informational purposes when building multi-model systems.

## Syntax

```text
VDIM key
```

Returns an integer: the number of dimensions, or an error if the key does not exist.

## Basic Usage

```bash
# Create a vector set with 4-dimensional vectors
VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 item1
VADD my_vectors VALUES 4 0.5 0.6 0.7 0.8 item2

# Check dimensions
VDIM my_vectors
# Returns: (integer) 4

# Real-world: 384-dimensional sentence embeddings
# After adding vectors: VDIM articles:vectors -> 384
```

## Checking Dimensions Before Adding New Vectors

Before inserting a new vector, verify it matches the existing index dimensionality:

```bash
# Existing index was built with 384-dim vectors
VDIM articles:index
# Returns: 384

# New vector to add must also be 384-dim
# Adding a 768-dim vector would fail
```

## Python Example: Compatibility Validation

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_index_dimension(key: str) -> int:
    """Get the dimension of an existing vector index."""
    try:
        return int(r.execute_command("VDIM", key))
    except Exception:
        return 0

def validate_and_add_vector(key: str, element_id: str, embedding: list) -> bool:
    """Add a vector only if its dimensions match the index."""
    expected_dim = get_index_dimension(key)

    if expected_dim == 0:
        # Index is empty, use the embedding's dimension
        expected_dim = len(embedding)

    if len(embedding) != expected_dim:
        raise ValueError(
            f"Dimension mismatch: index expects {expected_dim}D, "
            f"got {len(embedding)}D for element '{element_id}'"
        )

    cmd = (
        ["VADD", key, "VALUES", str(len(embedding))]
        + [str(v) for v in embedding]
        + [element_id]
    )
    r.execute_command(*cmd)
    return True

# Create an index with 8-dim vectors
r.execute_command("VADD", "docs:index", "VALUES", "8",
                  "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "doc1")

dim = get_index_dimension("docs:index")
print(f"Index dimension: {dim}")  # 8

# Try adding a matching dimension vector
try:
    embedding_8d = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    validate_and_add_vector("docs:index", "doc2", embedding_8d)
    print("doc2 added successfully")
except ValueError as e:
    print(f"Error: {e}")

# Try adding a mismatched dimension vector
try:
    embedding_4d = [0.1, 0.2, 0.3, 0.4]
    validate_and_add_vector("docs:index", "doc3", embedding_4d)
except ValueError as e:
    print(f"Caught expected error: {e}")
```

## Managing Multi-Model Vector Stores

When using different embedding models, use VDIM to track which index uses which model:

```python
# Model registry: maps vector index keys to embedding dimensions
MODEL_DIMENSIONS = {
    384: "all-MiniLM-L6-v2",      # Sentence Transformers small
    768: "all-mpnet-base-v2",     # Sentence Transformers medium
    1536: "text-embedding-3-small",  # OpenAI
    3072: "text-embedding-3-large",  # OpenAI large
}

def get_model_name(key: str) -> str:
    """Identify which embedding model an index was built with."""
    dim = get_index_dimension(key)
    return MODEL_DIMENSIONS.get(dim, f"unknown-{dim}d")

# Create indexes for different models
r.execute_command("VADD", "docs:small", "VALUES", "4",
                  "0.1", "0.2", "0.3", "0.4", "doc1")

model = get_model_name("docs:small")
print(f"docs:small uses: {model}")
```

## VDIM vs VINFO for Dimension Queries

```bash
# VDIM: only dimension
VDIM my_vectors
# Returns: 384

# VINFO: full metadata including dimension
VINFO my_vectors
# Returns: key-value pairs including dimension among other fields
```

Use `VDIM` for quick dimension-only checks. Use `VINFO` when you need complete index metadata.

## Checking Multiple Indexes

```python
def check_all_dimensions(key_pattern: str) -> dict:
    """Return dimensions of all matching vector indexes."""
    keys = r.keys(key_pattern)
    dims = {}
    for key in keys:
        try:
            dim = r.execute_command("VDIM", key)
            dims[key] = int(dim) if dim else 0
        except Exception:
            dims[key] = -1  # Not a vector set
    return dims

dims = check_all_dimensions("*:vectors")
for key, dim in sorted(dims.items()):
    print(f"{key}: {dim} dimensions")
```

## Summary

`VDIM` returns the dimensionality of vectors stored in a Redis Vector Set. Since all vectors in a set must share the same dimensions, this command lets you validate compatibility before adding new vectors and identify which embedding model was used to build an index. Use it before `VADD` operations to prevent dimension mismatch errors, and use it in multi-model architectures to route queries to the correct index.
