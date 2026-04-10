# Validation Summary: How to Use TOPK.QUERY in Redis TopK Structure

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (TopK data structure)
- TOPK.QUERY command
- TOPK.RESERVE, TOPK.ADD, TOPK.LIST commands (supporting examples)

## Sources Consulted
- TOPK.QUERY official docs: https://redis.io/docs/latest/commands/topk.query/
- TOPK.RESERVE official docs: https://redis.io/docs/latest/commands/topk.reserve/
- TOPK.ADD official docs: https://redis.io/docs/latest/commands/topk.add/
- TOPK.LIST official docs: https://redis.io/docs/latest/commands/topk.list/
- Top-K data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/

## Issues Found
- **Incorrect algorithm name**: The post referred to the "Heavy Hitters algorithm" in the Accuracy Notes section. The Redis TopK implementation uses the **HeavyKeeper** algorithm (by Junzhi Gong et al.), not a generic "Heavy Hitters" algorithm. While "heavy hitters" describes the general problem class, the specific algorithm is HeavyKeeper. Changed "Heavy Hitters algorithm" to "HeavyKeeper algorithm."

## Review Notes
- The `TOPK.QUERY` syntax, parameters, and return values are all correct per official docs.
- The `TOPK.RESERVE search_terms 10 2000 7 0.9` example is valid (topk=10, width=2000, depth=7, decay=0.9). The official docs show a similar example with `TOPK.RESERVE topk 50 2000 7 0.925`.
- The `TOPK.ADD` usage with multiple items including duplicates is correct.
- The `TOPK.LIST WITHCOUNT` option is correctly documented.
- Return values are described as integers (1/0), which is accurate for RESP2. Under RESP3, they are booleans — but since most users interact via RESP2, this is a reasonable default description.
- The use case examples are practical and well-constructed.
