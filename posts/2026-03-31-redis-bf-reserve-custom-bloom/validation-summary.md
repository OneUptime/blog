# Validation Summary: How to Use BF.RESERVE in Redis to Create a Custom Bloom Filter

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module
- Bloom filters (probabilistic data structures)
- BF.RESERVE, BF.ADD, BF.MADD, BF.INFO commands

## Sources Consulted
- Official Redis BF.RESERVE documentation — https://redis.io/docs/latest/commands/bf.reserve/
- Official Redis BF.ADD documentation — https://redis.io/docs/latest/commands/bf.add/
- Official Redis BF.INFO documentation — https://redis.io/docs/latest/commands/bf.info/
- Redis Bloom filter overview — https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- Redis probabilistic configuration parameters — https://redis.io/docs/latest/develop/data-types/probabilistic/configuration/
- Standard Bloom filter sizing formula: m = -(n * ln(p)) / (ln(2))^2

## Issues Found
No technical issues found.

All nine verified claims are accurate:

1. **Syntax** — `BF.RESERVE key error_rate capacity [EXPANSION expansion] [NONSCALING]` matches official docs.
2. **Auto-creation defaults** — 100 capacity and 0.01 (1%) error rate confirmed via `bf-initial-size` and `bf-error-rate` configuration defaults.
3. **Default EXPANSION value** — 2 is correct per `bf-expansion-factor` default.
4. **NONSCALING behavior** — correctly described; BF.ADD returns an error when a non-scaling filter is full.
5. **Error on existing key** — `(error) ERR item exists` matches the official documentation example.
6. **Return value** — `OK` on success confirmed (Simple string reply).
7. **Memory estimates** — values are reasonable approximations of the theoretical Bloom filter formula, appropriately marked with `~` qualifier.
8. **BF.INFO output format** — all field names (Capacity, Size, Number of filters, Number of items inserted, Expansion rate) match official docs.
9. **Expansion behavior** — "4x the previous size (1000, 4000, 16000, ...)" correctly describes how the expansion multiplier applies to each subsequent sub-filter.

## Review Notes
None.
