# How to Use cosineDistance() and L2Distance() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, cosineDistance, L2Distance, Vector Search, Distance Function, Similarity

Description: Learn how to use cosineDistance() and L2Distance() in ClickHouse for vector similarity search and understand when to choose each metric.

---

ClickHouse provides built-in distance functions for comparing embedding vectors. The two most commonly used are `cosineDistance()` for semantic similarity and `L2Distance()` (Euclidean distance) for geometric proximity. Choosing the right one significantly affects the quality of your similarity search results.

## cosineDistance()

Cosine distance measures the angle between two vectors, ignoring magnitude. It returns a value between 0 (identical direction) and 2 (opposite directions). Values less than 0.3 typically indicate high similarity for text embeddings.

```sql
SELECT cosineDistance([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) AS same;       -- 0
SELECT cosineDistance([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]) AS orthogonal;  -- 1
SELECT cosineDistance([1.0, 0.0, 0.0], [-1.0, 0.0, 0.0]) AS opposite;   -- 2
```

Use `cosineDistance` when:
- Comparing text or document embeddings from language models
- The magnitude of vectors is not meaningful (e.g., TF-IDF vectors)
- You care about directional similarity

```sql
SELECT
    doc_id,
    title,
    cosineDistance(embedding, [0.12, 0.88, 0.34]) AS dist
FROM documents
ORDER BY dist ASC
LIMIT 10;
```

## L2Distance()

L2Distance computes the Euclidean distance between two vectors - the straight-line distance in the embedding space.

```sql
SELECT L2Distance([0.0, 0.0], [3.0, 4.0]) AS dist;  -- 5.0
```

Use `L2Distance` when:
- Embeddings are normalized (unit vectors) - in this case L2 and cosine produce the same ranking
- You are comparing image embeddings or numerical feature vectors where magnitude matters
- Your ANN index was built with L2 distance

```sql
SELECT
    item_id,
    title,
    L2Distance(embedding, [0.12, 0.88, 0.34]) AS dist
FROM products
ORDER BY dist ASC
LIMIT 10;
```

## Other Distance Functions

ClickHouse also includes:

```sql
-- L1 (Manhattan) distance
SELECT L1Distance([1.0, 2.0], [4.0, 6.0]) AS l1;   -- 7.0

-- Linf (Chebyshev) distance
SELECT LinfDistance([1.0, 2.0], [4.0, 6.0]) AS linf;  -- 4.0

-- Dot product (higher = more similar)
SELECT dotProduct([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]) AS dot;  -- 32.0
```

## Cosine Similarity vs cosineDistance

If you need similarity (higher = more similar) instead of distance (lower = more similar):

```sql
SELECT 1 - cosineDistance(embedding, query_vec) AS cosine_similarity
FROM documents
ORDER BY cosine_similarity DESC
LIMIT 10;
```

## Filtering by Distance Threshold

Apply a threshold to return only sufficiently similar results:

```sql
SELECT
    doc_id,
    title,
    cosineDistance(embedding, [0.12, 0.88, 0.34]) AS dist
FROM documents
WHERE cosineDistance(embedding, [0.12, 0.88, 0.34]) < 0.25
ORDER BY dist ASC
LIMIT 20;
```

ClickHouse's vector similarity (ANN) index is triggered by `ORDER BY distance_function(...) LIMIT N`, not by WHERE clauses. The WHERE predicate above is applied as a post-filter on the results returned by the ORDER BY + LIMIT pattern.

## Performance Comparison

```sql
-- Measure query time for both metrics
SELECT
    cosineDistance(embedding, [0.12, 0.88, 0.34]) AS cdist,
    L2Distance(embedding, [0.12, 0.88, 0.34]) AS l2dist
FROM documents
ORDER BY cdist ASC
LIMIT 5;
```

Both functions have similar computational cost. The key difference is which ANN index type you built - match the distance function in the query to the one used when building the index. Note that vector indexes built with `L2Distance` or `cosineDistance` only accelerate `ORDER BY ... ASC` queries, while `dotProduct` indexes only accelerate `ORDER BY ... DESC` queries.

## Summary

Use `cosineDistance()` for text and language model embeddings where directional similarity matters. Use `L2Distance()` for numerical feature vectors or when magnitude is significant. Both support ANN index acceleration when used in a WHERE clause condition. Build your ANN index using the same metric you plan to query with.
