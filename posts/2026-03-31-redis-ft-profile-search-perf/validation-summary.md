# Validation Summary: How to Use FT.PROFILE in Redis to Analyze Search Performance

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RediSearch (FT.PROFILE, FT.SEARCH, FT.AGGREGATE, FT.CREATE)

## Sources Consulted
- Redis official documentation for FT.PROFILE: https://redis.io/docs/latest/commands/ft.profile/
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/

## Issues Found

### 1. Incorrect result processor type "Reducer"
- **What was wrong:** The Result Processor Types table listed "Reducer" as a processor that "Applies aggregate functions (COUNT, SUM, etc.)". The official Redis documentation does not list "Reducer" as a result processor type.
- **What was changed:** Replaced "Reducer" with "Projector" and updated the description to "Applies field transformations (FT.AGGREGATE)", matching the official documentation.

### 2. Inaccurate description of the LIMITED flag
- **What was wrong:** The post described LIMITED as "reduces profiling overhead by only collecting top-level stats" and "skips per-node timing, returning only the total time and top-level counters." Per the official docs, LIMITED specifically removes details of reader iterators within unions (verbose for fuzzy/prefix expansions), while retaining time and counter data for each top-level iterator.
- **What was changed:** Updated both descriptions of LIMITED to accurately reflect that it omits detailed reader iterator data within unions, reducing output size while retaining time and counter for each top-level iterator.

### 3. Invalid comment syntax in Redis code block
- **What was wrong:** The WILDCARD Iterator section used SQL-style `--` comments inside a Redis code block. Redis CLI does not support `--` as a comment delimiter, so these lines would cause errors if executed.
- **What was changed:** Moved the comments outside the code blocks as regular markdown text, splitting the single code block into two separate blocks with descriptive text between them.

## Review Notes
- The post covers only the most common iterator types (UNION, INTERSECT, NOT, TEXT, TAG, NUMERIC, WILDCARD). The official docs also list VECTOR, GEO, EMPTY, OPTIONAL, OPTIMIZER, ID-LIST, and METRIC - VECTOR DISTANCE. This is acceptable for an introductory tutorial but readers working with vector search or geo queries should consult the official docs.
- Similarly, the result processor table omits several documented types (Highlighter, Pager/Limiter, Counter, Threadsafe-Loader, Metrics Applier, Network). This is reasonable for a focused tutorial.
- The FT.CREATE syntax, HSET commands, FT.PROFILE syntax, query examples, and profile output format are all accurate.
- FT.PROFILE is a current, non-deprecated command available since RediSearch 2.2.0.
