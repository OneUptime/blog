# Validation Summary: How to Use wordShingleMinHash() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- wordShingleMinHash() function
- wordShingleSimHash() function
- wordShingleMinHashCaseInsensitive() function
- MinHash / SimHash locality-sensitive hashing algorithms

## Sources Consulted
- ClickHouse official documentation on hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse official documentation on wordShingleMinHash: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions#wordshingleminhash
- ClickHouse official documentation on wordShingleSimHash: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions#wordshinglesimhash

## Issues Found
1. **Incorrect parameter names in function signature**: The blog listed the signature as `wordShingleMinHash(str, shingleSize, hashesCount)`. Per the official ClickHouse documentation, the correct signature is `wordShingleMinHash(string[, shinglesize, hashnum])`. The second and third parameters are optional (with defaults of shinglesize=3 and hashnum=6), and the third parameter is named `hashnum`, not `hashesCount`. Fixed the parameter description to match the official docs.

## Review Notes
- All SQL code examples use valid syntax and correct parameter ordering. The function calls are positional, so the parameter naming issue did not affect the correctness of any SQL examples.
- The blog consistently uses `hashnum=1` in all MinHash examples, which is valid but less precise than the default of 6. This is a reasonable simplification for a tutorial but worth noting that production use cases may benefit from a higher hashnum value.
- The conceptual explanations of MinHash and SimHash as locality-sensitive hash functions are accurate.
- Return types are correctly described: `wordShingleMinHash` returns `Tuple(UInt64, UInt64)` and `wordShingleSimHash` returns `UInt64`.
- The `wordShingleMinHashCaseInsensitive` function exists and is used correctly.
- The word shingle explanation and example ("the quick", "quick brown", "brown fox" for shingle size 2) is accurate.
