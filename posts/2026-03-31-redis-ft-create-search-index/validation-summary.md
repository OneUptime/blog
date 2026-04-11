# Validation Summary: How to Use FT.CREATE in Redis to Create a Search Index

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack
- RediSearch (FT.CREATE, FT.SEARCH, FT.INFO, FT.DROPINDEX, FT.AGGREGATE)
- RedisJSON (JSON.SET)
- Vector similarity search (FLAT algorithm, FLOAT32, COSINE distance)

## Sources Consulted
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation for FT.DROPINDEX: https://redis.io/docs/latest/commands/ft.dropindex/
- Redis official documentation for FT.INFO: https://redis.io/docs/latest/commands/ft.info/
- Redis official documentation for JSON.SET: https://redis.io/docs/latest/commands/json.set/
- Redis Stack vector similarity documentation: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/

## Issues Found
No technical issues found.

## Review Notes
- The Field Types table is correct but not exhaustive. For example, TAG also supports CASESENSITIVE and SORTABLE; NUMERIC also supports NOINDEX; GEO supports SORTABLE. The post does not claim the table is comprehensive, so this is not an error, but readers should consult the official docs for the full list of per-type options.
- The basic syntax block omits some less common options (MAXTEXTFIELDS, TEMPORARY, STOPWORDS, LANGUAGE_FIELD, SCORE_FIELD, PAYLOAD_FIELD, SKIPINITIALSCAN). This is reasonable for an introductory tutorial and not an error.
- The VECTOR FLAT example correctly uses `6` as the attribute count matching 3 key-value pairs (TYPE FLOAT32, DIM 384, DISTANCE_METRIC COSINE).
- The NOINDEX + SORTABLE combination on the `views` field in the idx:articles example is a valid and useful pattern that is correctly demonstrated.
