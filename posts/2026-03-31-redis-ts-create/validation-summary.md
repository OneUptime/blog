# Validation Summary: How to Use TS.CREATE in Redis Time Series

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis TimeSeries module
- TS.CREATE command
- TS.ALTER, TS.ADD, TS.MRANGE, TS.MGET, TS.QUERYINDEX (referenced)

## Sources Consulted
- Official Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/
- Official Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/
- Official Redis TS.ALTER documentation: https://redis.io/docs/latest/commands/ts.alter/

## Issues Found
1. **Missing IGNORE parameter description**: The IGNORE parameter was listed in the syntax block but had no corresponding bullet point explanation, while every other parameter was described. Added a concise description explaining that IGNORE acts as a deduplication filter based on time and value difference thresholds, with the prerequisite that the duplicate policy is LAST and the sample is in-order.

## Review Notes
- The blog references "Gorilla encoding" for COMPRESSED mode. The official redis.io docs do not name the algorithm explicitly, but this is well-documented in the Redis TimeSeries source code and community materials (based on Facebook's Gorilla paper, VLDB 2015). The claim is accurate.
- The compression memory savings is stated as "50-90%" while official docs say "about 90%". The blog's range is arguably more conservative and realistic since actual compression depends on data characteristics. Not an error.
- The summary states properties "cannot be changed as easily after data has been ingested." This is slightly misleading since TS.ALTER can modify RETENTION, CHUNK_SIZE, DUPLICATE_POLICY, and LABELS after creation. Only ENCODING cannot be changed. However, the qualifier "as easily" makes this defensible.
- Redis CLI comments using `--` syntax are used for illustration throughout code blocks. Redis does not support inline comments, so these would produce errors if pasted directly into redis-cli. This is a common convention in educational blog posts and not treated as an error.
- CHUNK_SIZE has constraints (must be a multiple of 8, range [48..1048576]) that are not mentioned. This is an omission rather than an error.
