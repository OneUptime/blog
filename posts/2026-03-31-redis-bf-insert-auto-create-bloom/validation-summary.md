# Validation Summary: How to Use BF.INSERT in Redis for Auto-Creating Bloom Filters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module (BF.INSERT, BF.ADD, BF.MADD, BF.RESERVE commands)
- Python redis-py client library
- Bloom Filter probabilistic data structure

## Sources Consulted
- Official Redis BF.INSERT documentation: https://redis.io/docs/latest/commands/bf.insert/
- Official Redis BF.ADD documentation: https://redis.io/docs/latest/commands/bf.add/
- Redis Bloom Filter configuration defaults: https://redis.io/docs/latest/develop/data-types/probabilistic/configuration/

## Issues Found
1. **Incorrect claim about BF.ADD requiring BF.RESERVE** (intro paragraph): The post stated "Unlike `BF.ADD`, which requires you to first create a Bloom filter with `BF.RESERVE`". This is incorrect — `BF.ADD` also auto-creates filters if the key does not exist, using module-level defaults. The real distinction is that `BF.INSERT` allows specifying custom capacity, error rate, and expansion parameters during auto-creation, while `BF.ADD` only uses defaults. Fixed the intro to accurately describe the difference.

2. **Incorrect NONSCALING behavior description** (after the deduplication pipeline example): The post stated NONSCALING gives "predictable memory usage at the cost of higher false positives once full." Per the official documentation, a non-scaling filter returns an error when capacity is reached — it does not silently degrade with higher false positives. Fixed to state that additional insert attempts return an error once capacity is reached.

## Review Notes
- The syntax, parameter descriptions, default values (CAPACITY 100, ERROR 0.01), return values, and NOCREATE behavior are all accurate per official documentation.
- The Python code examples use `r.execute_command()` which is the correct approach for RedisBloom commands via redis-py.
- The comparison table (BF.INSERT vs BF.ADD vs BF.MADD) is accurate and helpful.
- The exact error message text `ERR not found` for NOCREATE on a missing filter is commonly observed in practice, though the official docs only specify that "an error is returned" without naming the exact message.
