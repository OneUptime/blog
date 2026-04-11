# How to Use VEMB in Redis to Retrieve Vector Embeddings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Embedding, Retrieval, Machine Learning

Description: Learn how to use VEMB in Redis to retrieve the stored vector embedding for a specific element in a Vector Set.

---

## What Is VEMB?

`VEMB` retrieves the vector embedding stored for a named element in a Redis Vector Set. This lets you fetch the raw vector representation of any indexed item, which is useful for debugging, re-indexing, computing distances outside Redis, or feeding into downstream ML pipelines.

## Syntax

```text
VEMB key element
```

Returns the vector as an array of floating-point values, or an empty array/nil if the element does not exist.

## Basic Usage

```bash
# Add a vector
VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 user:1001

# Retrieve the stored embedding
VEMB my_vectors user:1001
# 1) "0.10000000149011612"
# 2) "0.20000000298023224"
# 3) "0.30000001192092896"
# 4) "0.4000000059604645"
```

Note that returned values may differ slightly from the inserted values due to floating-point representation and optional quantization.

## Quantization Effects

The precision of returned values depends on the quantization format used when adding:

```bash
# NOQUANT - full precision, no quantization
VADD vectors:noquant VALUES 4 0.123456789 0.234567890 0.345678901 0.456789012 item1 NOQUANT
VEMB vectors:noquant item1
# Close to original: ~0.1234..., ~0.2345..., etc.

# Q8 - signed 8-bit quantization (lower precision)
VADD vectors:q8 VALUES 4 0.123456789 0.234567890 0.345678901 0.456789012 item1 Q8
VEMB vectors:q8 item1
# Less precise: values rounded to fewer significant digits
```

## Python Example: Retrieving and Using Embeddings

```python
import redis
import numpy as np

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def store_embedding(key: str, element_id: str, embedding: list):
    """Store a vector embedding in Redis."""
    dim = len(embedding)
    cmd = ["VADD", key, "VALUES", str(dim)] + [str(v) for v in embedding] + [element_id]
    r.execute_command(*cmd)

def retrieve_embedding(key: str, element_id: str) -> list:
    """Retrieve a vector embedding from Redis."""
    result = r.execute_command("VEMB", key, element_id)
    return [float(v) for v in result] if result else []

# Store some embeddings
dim = 6
embeddings = {
    "product:laptop": [0.8, 0.2, 0.1, 0.6, 0.9, 0.3],
    "product:keyboard": [0.7, 0.3, 0.15, 0.55, 0.85, 0.4],
    "product:mouse": [0.6, 0.35, 0.2, 0.5, 0.8, 0.45],
}

for item_id, embedding in embeddings.items():
    store_embedding("products:vectors", item_id, embedding)

# Retrieve and compare
retrieved = retrieve_embedding("products:vectors", "product:laptop")
original = embeddings["product:laptop"]

print(f"Original:  {original}")
print(f"Retrieved: {[round(v, 4) for v in retrieved]}")

# Compute cosine similarity manually
def cosine_similarity(a: list, b: list) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))

laptop_vec = retrieve_embedding("products:vectors", "product:laptop")
keyboard_vec = retrieve_embedding("products:vectors", "product:keyboard")
sim = cosine_similarity(laptop_vec, keyboard_vec)
print(f"Cosine similarity: {sim:.4f}")
```

## Use Case: Re-Indexing in a New Store

When migrating to a different index or different quantization:

```python
def migrate_vectors(source_key: str, dest_key: str, quantization: str = "NOQUANT"):
    """Copy all vectors from one index to another with different settings."""
    # Get all element IDs via VSIM trick or store them separately
    # For this example, assume element IDs are tracked externally
    element_ids = r.smembers(f"{source_key}:ids")  # Assuming tracked in a set

    migrated = 0
    for element_id in element_ids:
        embedding = retrieve_embedding(source_key, element_id)
        if embedding:
            dim = len(embedding)
            cmd = (
                ["VADD", dest_key, "VALUES", str(dim)]
                + [str(v) for v in embedding]
                + [element_id, quantization]
            )
            r.execute_command(*cmd)
            migrated += 1

    print(f"Migrated {migrated} vectors from '{source_key}' to '{dest_key}'")
```

## Verifying Round-Trip Accuracy

```python
def check_roundtrip_error(key: str, element_id: str, original: list) -> float:
    """Compute max error between stored and retrieved embedding."""
    retrieved = retrieve_embedding(key, element_id)
    if len(original) != len(retrieved):
        return float("inf")

    errors = [abs(o - r_) for o, r_ in zip(original, retrieved)]
    return max(errors)

# Test precision
original_vec = [0.12345678, 0.23456789, 0.34567890, 0.45678901]
store_embedding("test:vectors", "test_item", original_vec)

error = check_roundtrip_error("test:vectors", "test_item", original_vec)
print(f"Max roundtrip error: {error:.8f}")
```

## Error Handling

```python
def safe_retrieve_embedding(key: str, element_id: str) -> list | None:
    """Retrieve embedding with error handling."""
    try:
        result = r.execute_command("VEMB", key, element_id)
        return [float(v) for v in result] if result else None
    except Exception as e:
        print(f"Failed to retrieve embedding for '{element_id}': {e}")
        return None
```

## Summary

`VEMB` retrieves the stored vector embedding for a named element in a Redis Vector Set. Returned values may differ slightly from the inserted values due to floating-point representation and quantization (especially with Q8 or BIN). Use VEMB for debugging vector contents, migrating indexes, computing custom similarity metrics outside Redis, and validating embedding roundtrips. For bulk retrieval of all elements, consider tracking element IDs in a separate Redis set alongside the vector index.
