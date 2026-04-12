# Validation Summary: How to Order Aggregation Stages for Maximum Performance in MongoDB

## Status
validated

## Post Type
Tutorial / Performance Optimization Guide

## Technologies Covered
- MongoDB Aggregation Framework
- MongoDB Query Optimizer (pipeline coalescence, top-K sort)
- MongoDB `explain()` for query analysis

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline Optimization (https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/)
- MongoDB Manual: $sort stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/)
- MongoDB Manual: $match stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/)
- MongoDB Manual: $lookup stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)
- MongoDB Manual: $unwind stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/)
- MongoDB Manual: $facet stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/)
- MongoDB Manual: explain() results (https://www.mongodb.com/docs/manual/reference/explain-results/)

## Issues Found
- **$unwind section: non-equivalent "slow" vs "fast" examples.** The original examples filtered on the same field being unwound (`tags`). The "slow" version (`$unwind` then `$match: { tags: "featured" }`) produces one document per original where the unwound tag equals "featured". The "fast" version (`$match: { tags: "featured" }` then `$unwind`) matches documents whose array contains "featured", then unwinds *all* tags — producing multiple documents per original (one for every tag, not just "featured"). These are not semantically equivalent. Fixed by changing the filter to a non-array field (`status: "active"`), which makes both versions produce identical results and correctly demonstrates the optimization of filtering before unwinding.

## Review Notes
- The section title "$unwind: Push Down Before $group" is slightly misleading — the content actually demonstrates pushing `$match` before `$unwind`, not pushing `$unwind` before `$group`. This is a clarity issue rather than a technical error, so it was left unchanged.
- The "Recommended Stage Order Template" is a useful general guideline but real pipelines will vary. For instance, many pipelines need `$group` before the second `$sort` + `$limit`, and `$unwind` is often paired with `$lookup` (to flatten the joined array) rather than used independently. The template is reasonable as a starting point.
- MongoDB's aggregation optimizer does perform some automatic stage reordering (e.g., moving `$match` before `$sort`, coalescing adjacent `$match` stages), but the manual optimizations described in the post remain valuable because the optimizer has limits and cannot handle all cases.
- All code examples use correct MongoDB syntax and current (non-deprecated) aggregation operators.
- The `explain("executionStats")` usage is correct for verifying index usage in aggregation pipelines.
