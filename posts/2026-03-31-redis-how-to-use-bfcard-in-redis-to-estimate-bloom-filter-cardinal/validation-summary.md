# Validation Summary: How to Use BF.CARD in Redis to Estimate Bloom Filter Cardinality

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module (BF.CARD, BF.RESERVE, BF.MADD, BF.ADD, BF.INFO)
- Python (redis-py client)
- Node.js (node-redis client)
- Docker

## Sources Consulted
- Redis official documentation for BF.CARD: https://redis.io/commands/bf.card/
- Redis official documentation for BF.RESERVE: https://redis.io/commands/bf.reserve/
- Redis official documentation for BF.MADD: https://redis.io/commands/bf.madd/
- Redis official documentation for BF.ADD: https://redis.io/commands/bf.add/
- Redis official documentation for BF.INFO: https://redis.io/commands/bf.info/
- RedisBloom GitHub repository and issue tracker (issue #488 discussing BF.CARD implementation)

## Issues Found
1. **Incorrect description of BF.CARD internals (Cardinality Estimate Accuracy section):** The post stated "The estimate from `BF.CARD` is derived from the number of set bits in the filter." This is factually incorrect. BF.CARD reads a stored internal counter that is incremented each time an insertion causes at least one new bit to be set in a sub-filter. It does not scan or count set bits. The text was rewritten to accurately describe the counter-based mechanism and explain why the count can diverge from the true number of unique items (false positives during insertion can prevent the counter from incrementing for genuinely new items).

## Review Notes
- The post frames BF.CARD as returning an "estimate" or "approximate" count throughout. This is acceptable shorthand since the returned value can differ from the true count of unique items due to false positives during insertion, but strictly speaking BF.CARD returns an exact counter value, not a statistical estimate. The official docs describe it as returning "the number of items that were added to a Bloom filter and detected as unique."
- BF.CARD returns 0 for non-existent keys (does not error). The practical use case code wraps the call in a try/except, which is unnecessary but not harmful.
- All command syntaxes (BF.RESERVE, BF.MADD, BF.ADD, BF.CARD, BF.INFO) are correct per official documentation.
- Python and Node.js code examples use correct APIs and are syntactically valid.
- The claim that BF.CARD was introduced in RedisBloom 2.4.4 is confirmed by official docs.
- The O(1) time complexity claim is confirmed by official docs.
