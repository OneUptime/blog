# Validation Summary: How to Use BF.CARD in Redis to Estimate Bloom Filter Size

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (BF.CARD, BF.ADD, BF.MADD, BF.RESERVE, BF.INFO commands)
- Bloom filter data structure

## Sources Consulted
- Redis official documentation for BF.CARD: https://redis.io/commands/bf.card/
- Redis official documentation for BF.INFO: https://redis.io/commands/bf.info/
- Redis official documentation for BF.RESERVE: https://redis.io/commands/bf.reserve/
- Redis official documentation for BF.ADD: https://redis.io/commands/bf.add/
- Redis official documentation for BF.MADD: https://redis.io/commands/bf.madd/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly uses the phrase "detected as unique" when describing what BF.CARD counts, which is an important nuance — Bloom filters are probabilistic, so an item whose bits are already set by other items may not increment the counter even though it is genuinely new. The post handles this accurately on line 13.
- BF.CARD syntax, return values (integer for existing filters, 0 for non-existent keys), and O(1) complexity are all confirmed correct per official docs. Available since RedisBloom 2.4.4.
- BF.RESERVE argument order (`key error_rate capacity`) is used correctly in the examples.
- BF.INFO fields listed (Capacity, Size, Number of filters, Number of items inserted, Expansion rate) are confirmed accurate.
- The `--` comment syntax used in the BF.CARD vs BF.INFO comparison block is not valid Redis CLI syntax, but it is clearly used as illustrative pseudocode rather than runnable commands, so this is acceptable.
- The post could mention that BF.CARD was introduced in RedisBloom 2.4.4 for version-awareness, but this is not an error.
