# Validation Summary: How to Use $sample to Randomly Select Documents in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$sample` aggregation stage
- `$match`, `$project`, `$out` aggregation stages

## Sources Consulted
- MongoDB official documentation for `$sample`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
- MongoDB official documentation for `$facet`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/

## Issues Found

### 1. Incomplete conditions for pseudo-random cursor (fast path)
**What was wrong:** The "How $sample Is Implemented" section only listed one condition for the fast pseudo-random cursor algorithm (sample size < 5% of collection). The official MongoDB documentation specifies three conditions that must all be met: (1) `$sample` is the first stage of the pipeline, (2) `size` is less than 5% of total documents, and (3) the collection contains more than 100 documents.

**What was changed:** Rewrote the section to list all three conditions explicitly and restructured it to clearly distinguish the fast path from the slow path.

**Why:** This is a significant omission because several examples in the post (e.g., `$match` before `$sample`) would not use the fast path since `$sample` is not the first stage. Readers following the performance advice without knowing about the first-stage requirement would get unexpected behavior.

### 2. Incorrect claim that $sample cannot be used inside $facet
**What was wrong:** The Limitations section stated "The stage cannot be used inside `$facet`." According to MongoDB's official documentation, `$sample` is not in the list of stages restricted from use within `$facet`. The restricted stages are: `$collStats`, `$facet`, `$geoNear`, `$indexStats`, `$out`, `$merge`, `$planCacheStats`, `$search`, `$searchMeta`, and `$vectorSearch`.

**What was changed:** Removed the incorrect bullet point about `$facet`.

**Why:** This claim would mislead readers into thinking `$sample` inside `$facet` is unsupported, when it is a valid use case.

### 3. Incomplete performance advice in Summary
**What was wrong:** The Summary section advised keeping sample sizes below 5% but did not mention the first-stage requirement for the fast path.

**What was changed:** Added mention of placing `$sample` as the first pipeline stage alongside the 5% advice.

**Why:** Consistent with the corrected implementation section; both conditions matter for performance.

## Review Notes
- The `$match` + `$sample` example (Combining $sample with $match) is functionally correct but readers should be aware it will use the slower random-sort path since `$sample` is not the first stage. The corrected "How $sample Is Implemented" section now makes this clear.
- The A/B testing example mixes `await` (async) with a non-awaited aggregation call. This is a stylistic inconsistency but not a technical error since the example is illustrative rather than production-ready.
