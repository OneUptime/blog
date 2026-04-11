# Validation Summary: How to Use CMS.QUERY in Redis Count-Min Sketch

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (Count-Min Sketch data structure)
- CMS.QUERY, CMS.INITBYDIM, CMS.INCRBY commands

## Sources Consulted
- Redis official documentation for CMS.QUERY: https://redis.io/docs/latest/commands/cms.query/
- Redis official documentation for CMS.INITBYDIM: https://redis.io/docs/latest/commands/cms.initbydim/
- Redis official documentation for CMS.INCRBY: https://redis.io/docs/latest/commands/cms.incrby/
- Count-Min Sketch academic paper (Cormode & Muthukrishnan, 2005) for accuracy guarantees

## Issues Found

1. **Missing CMS.INITBYDIM in "Query Multiple Items" example**: The `api_calls` key was used with `CMS.INCRBY` without first being initialized via `CMS.INITBYDIM`. Per the official docs, `CMS.INCRBY` returns an error if the key does not exist. Added `CMS.INITBYDIM api_calls 5000 7` before the `CMS.INCRBY` call.

2. **Missing CMS.INITBYDIM in "Fraud Detection" example**: The `failed_logins` key was used with `CMS.INCRBY` without initialization. Added `CMS.INITBYDIM failed_logins 1000 5` before the increment calls.

## Review Notes
- The "Accuracy Considerations" section states "Expected overestimation per element: N / W". The standard Count-Min Sketch theoretical bound is actually eN/W (where e is Euler's number ~2.718), making the formal bound ~1359 for the given example rather than ~500. However, N/W is a reasonable approximation of the expected per-row collision count, and the general principle conveyed is correct. This is a common simplification in practical guides.
- Redis CLI does not support `--` as a comment syntax. The post uses `--` comments as annotations in several code blocks. This is a widespread convention in Redis blog posts and tutorials, and the intent is clear, so no change was made.
- The TOPK.QUERY reference in the comparison table is correct — it is a valid RedisBloom command for querying Top-K items.
