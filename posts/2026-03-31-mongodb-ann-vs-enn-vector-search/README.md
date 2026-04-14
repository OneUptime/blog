# How to Choose Between ANN and ENN Search in MongoDB Atlas Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Atlas Search

Description: Understand the difference between Approximate Nearest Neighbor and Exact Nearest Neighbor search in MongoDB Atlas Vector Search and when to choose each approach.

---

Atlas Vector Search supports two modes for finding similar vectors: Approximate Nearest Neighbor (ANN) and Exact Nearest Neighbor (ENN). Choosing the right mode depends on the trade-off between speed and precision for your specific use case.

## What is ANN?

Approximate Nearest Neighbor search uses the HNSW (Hierarchical Navigable Small World) graph structure to find vectors that are very close to the query vector - but not guaranteed to be the absolute nearest. The trade-off is speed: ANN searches millions of vectors in milliseconds.

```javascript
// ANN query - uses HNSW index, fast, approximate
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 150,  // candidates to consider in the HNSW graph
      limit: 10
    }
  }
])
```

`numCandidates` controls the recall-speed trade-off: higher values improve recall (more true nearest neighbors found) at the cost of latency.

## What is ENN?

Exact Nearest Neighbor search performs a full sequential scan of all vectors to guarantee finding the true nearest neighbors. Atlas supports ENN through the `$vectorSearch` stage with `exact: true`:

```javascript
// ENN query - brute force scan, exact but slower
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      exact: true,
      limit: 10
    }
  }
])
```

Note: `exact: true` does not use the HNSW index. It scans all candidates.

## Performance Comparison

```text
Collection size: 1 million documents
Vector dimensions: 1536

ANN (numCandidates=150): ~15ms, recall ~95%
ANN (numCandidates=500): ~45ms, recall ~99%
ENN (exact):             ~8000ms, recall 100%
```

For large collections, ANN is orders of magnitude faster. ENN becomes practical only for small collections or offline batch jobs.

## When to Use ANN

Use ANN for:

- Real-time user-facing search (product recommendations, semantic search)
- Collections larger than ~50,000 documents
- Use cases where near-perfect recall is acceptable (most semantic search scenarios)
- High query throughput requirements

```javascript
// Typical production ANN query
db.articles.aggregate([
  {
    $vectorSearch: {
      index: "article_index",
      path: "embedding",
      queryVector: embed(userQuery),
      numCandidates: 100,
      limit: 5,
      filter: { published: { $eq: true } }
    }
  }
])
```

## When to Use ENN

Use ENN for:

- Small collections under ~10,000 documents where scan is fast
- Index evaluation and ground-truth generation (measure ANN recall)
- Batch jobs where latency is not critical
- Debug scenarios to verify ANN results are accurate

```python
# Evaluating ANN recall against ENN ground truth
ann_results = get_ann_results(query, k=10)
enn_results = get_enn_results(query, k=10)

ann_ids = {str(r["_id"]) for r in ann_results}
enn_ids = {str(r["_id"]) for r in enn_results}

recall = len(ann_ids & enn_ids) / len(enn_ids)
print(f"ANN recall@10: {recall:.2%}")
```

## Tuning ANN Recall

Increase recall without switching to ENN by raising `numCandidates`:

```text
numCandidates = 10   -> ~80% recall, very fast
numCandidates = 100  -> ~95% recall, fast
numCandidates = 500  -> ~99% recall, moderate
numCandidates = 2000 -> ~99.9% recall, slow
```

A good starting point is `numCandidates = limit * 20`, as recommended in the MongoDB documentation.

## Summary

ANN is the right choice for production search workloads - it provides sub-50ms latency at high recall using the HNSW index. ENN guarantees perfect recall but performs a full scan, making it suitable only for small collections or offline evaluation. Use ENN to measure the recall of your ANN configuration, then tune `numCandidates` until the recall meets your requirements.
