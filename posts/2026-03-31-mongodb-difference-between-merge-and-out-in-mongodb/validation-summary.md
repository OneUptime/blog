# Validation Summary: What Is the Difference Between $merge and $out in MongoDB

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- MongoDB aggregation pipeline
- `$out` aggregation stage
- `$merge` aggregation stage (MongoDB 4.2+)

## Sources Consulted
- MongoDB official documentation for `$out`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB official documentation for `$merge`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB aggregation pipeline stages reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/

## Issues Found

1. **Incorrect claim that `$out` drops existing indexes** (line 32): The post stated "$out drops existing indexes on the target collection." This is incorrect. According to MongoDB documentation, `$out` preserves indexes: it creates a temporary collection, copies indexes from the existing output collection to the temporary collection, inserts documents, then atomically renames the temporary collection. Changed to "Preserves existing indexes from the target collection."

2. **Incorrect comparison table entry for index preservation** (line 96): The table listed "Preserves indexes: No" for `$out`. Changed to "Yes" since `$out` does preserve indexes from the existing target collection.

3. **Misleading `$merge` benefit about index preservation** (line 121): The bullet "Preserve existing indexes and data not touched by the pipeline" implied index preservation was unique to `$merge`. Since `$out` also preserves indexes, changed to "Preserve existing data not touched by the pipeline" to focus on the actual differentiator.

4. **Summary incorrectly cited index preservation as a `$merge`-only advantage** (line 140): Changed "preserved indexes" to "incremental updates" in the closing recommendation since both stages preserve indexes.

## Review Notes
- All code examples are syntactically correct and use valid MongoDB aggregation syntax.
- The `whenMatched` and `whenNotMatched` option values shown are accurate (merge, replace, keepExisting, pipeline for whenMatched; insert for whenNotMatched).
- The use of `$$new` to reference incoming documents in `$merge` pipelines is correct.
- The use of `$$NOW` as a system variable is correct.
- Version claims are accurate: `$out` since 2.6, `$merge` since 4.2.
- The claim that `$out` cannot write to sharded collections is correct.
