# How to Use Quantization to Reduce Vector Storage in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Performance

Description: Apply scalar and binary quantization in MongoDB Atlas Vector Search to reduce storage costs and improve query speed with a minimal impact on recall accuracy.

---

High-dimensional vectors are expensive to store. A collection with 10 million 1536-dimension float32 vectors requires about 60GB of raw vector storage. Quantization compresses each vector by reducing the precision of its values, cutting storage by 4x to 32x while preserving most of the search quality.

## How Quantization Works

Atlas Vector Search supports two quantization types:

- **Scalar quantization** - converts 32-bit floats to 8-bit integers (4x compression)
- **Binary quantization** - converts each float to a single bit (32x compression, best for very high-dimensional models)

Quantization happens at index build time. The original 32-bit vectors are stored in the document, but the index uses compressed representations for candidate retrieval.

## Enabling Scalar Quantization

Define the quantization type in the index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine",
      "quantization": "scalar"
    }
  ]
}
```

This reduces the in-memory index footprint from ~24GB to ~6GB for 10 million 1536-dim vectors.

## Enabling Binary Quantization

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine",
      "quantization": "binary"
    }
  ]
}
```

Binary quantization works best with models that produce high-dimensional embeddings (1024 dimensions or more).

## Measuring Recall Impact

After enabling quantization, compare recall against a baseline:

```python
from pymongo import MongoClient

client = MongoClient("mongodb+srv://...")
db = client["mydb"]
collection = db["documents"]

def search(index_name: str, query_vec: list, limit: int = 10) -> list[str]:
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "index": index_name,
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": 100,
                "limit": limit
            }
        },
        {"$project": {"_id": 1}}
    ])
    return [str(r["_id"]) for r in results]

# Compare quantized vs non-quantized index
baseline_ids = search("index_float32", query_vector)
quantized_ids = search("index_scalar", query_vector)

overlap = len(set(baseline_ids) & set(quantized_ids))
recall = overlap / len(baseline_ids)
print(f"Scalar quantization recall: {recall:.2%}")
# Typical output: Scalar quantization recall: 97.00%
```

## Compensating for Recall Loss

Increase `numCandidates` to recover recall after enabling quantization:

```javascript
// Without quantization
{ numCandidates: 100, limit: 10 }  // ~98% recall

// With scalar quantization - raise numCandidates slightly
{ numCandidates: 150, limit: 10 }  // ~97% recall

// With binary quantization - raise numCandidates more
{ numCandidates: 300, limit: 10 }  // ~95% recall
```

## Choosing the Right Quantization Level

| Model | Dimensions | Recommended Quantization |
|-------|-----------|--------------------------|
| text-embedding-3-small | 1536 | scalar |
| text-embedding-3-large | 3072 | binary or scalar |
| ada-002 | 1536 | scalar |
| Small local models | 384 | none (already small) |

Binary quantization is most effective for models with 1024+ dimensions because information is distributed across more bits.

## Cost Benefit

```text
10M documents, 1536 dimensions, float32:
- Raw storage: ~60GB
- Scalar (int8): ~15GB (4x reduction)
- Binary (1-bit): ~1.9GB (32x reduction)
```

Smaller indexes also mean faster query times because more of the index fits in RAM.

## Summary

Quantization in Atlas Vector Search compresses the search index with minimal recall impact. Scalar quantization provides a safe 4x reduction suitable for most workloads. Binary quantization offers 32x compression but works best with high-dimensional embeddings (1024+ dimensions). In both cases, raise `numCandidates` slightly to compensate for the small recall loss.
