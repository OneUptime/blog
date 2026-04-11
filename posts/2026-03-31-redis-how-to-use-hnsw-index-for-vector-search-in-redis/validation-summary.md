# Validation Summary: How to Use HNSW Index for Vector Search in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (RediSearch module)
- HNSW (Hierarchical Navigable Small World) algorithm
- Python redis-py client library
- NumPy
- FT.CREATE / FT.SEARCH / FT.INFO commands

## Sources Consulted
- Redis vector field and type options documentation: https://redis.io/docs/latest/develop/interact/search-and-query/basic-constructs/field-and-type-options/#vector-fields
- Redis vector search query documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- Redis FT.CREATE command reference: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.INFO command reference: https://redis.io/docs/latest/commands/ft.info/
- redis-py vector search documentation: https://redis.io/docs/latest/develop/clients/redis-py/vecsearch/
- HNSW algorithm paper (Malkov & Yashunin, 2018)

## Issues Found
- **Incorrect HNSW attribute count in FT.CREATE command**: The command specified `VECTOR HNSW 10` but listed 6 key-value pairs (TYPE FLOAT32, DIM 768, DISTANCE_METRIC COSINE, M 16, EF_CONSTRUCTION 200, EF_RUNTIME 50), which totals 12 arguments, not 10. Fixed `10` to `12`.

## Review Notes
- The benchmark table in "Memory and Performance Benchmarks" appears to be illustrative/approximate (values prefixed with ~) rather than from official Redis benchmarks. The relative trends are reasonable (higher M increases memory and recall while reducing QPS), but readers should benchmark on their own hardware.
- The `get_index_info()` function uses `info.get()` dict-style access on the result of `ft().info()`. This works in current redis-py versions but the return type has varied across versions. This is acceptable for a tutorial.
- EF_RUNTIME is correctly shown as both a creation-time default parameter and a query-time override — this is accurate per Redis documentation.
