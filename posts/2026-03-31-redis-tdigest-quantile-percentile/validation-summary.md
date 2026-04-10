# Validation Summary: How to Use TDIGEST.QUANTILE in Redis T-Digest for Percentiles

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (T-Digest data structure)
- TDIGEST.QUANTILE command
- Related T-Digest commands (TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.CDF, TDIGEST.MIN, TDIGEST.MAX, TDIGEST.MEAN, TDIGEST.MERGE)

## Sources Consulted
- Redis T-Digest command documentation: https://redis.io/docs/latest/commands/tdigest.quantile/
- Redis T-Digest command documentation: https://redis.io/docs/latest/commands/tdigest.create/
- Redis T-Digest command documentation: https://redis.io/docs/latest/commands/tdigest.add/
- Redis T-Digest command documentation: https://redis.io/docs/latest/commands/tdigest.merge/
- RedisBloom T-Digest documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/
- Ted Dunning's T-Digest paper and reference implementation for accuracy characteristics

## Issues Found
1. **Incorrect claim about `nan` return for single-observation digests** (line 38): The post stated that `TDIGEST.QUANTILE` returns `nan` "when the digest is empty or has only one observation." Per Redis documentation, `nan` is returned only when the sketch is empty. A digest with a single observation returns that observation's value for any quantile query. Removed "or has only one observation" from the sentence.

## Review Notes
- The `TDIGEST.QUANTILE` syntax, parameters, and general behavior description are accurate and match current RedisBloom documentation.
- `TDIGEST.CREATE`, `TDIGEST.ADD`, `TDIGEST.CDF`, `TDIGEST.MIN`, `TDIGEST.MAX`, `TDIGEST.MEAN`, and `TDIGEST.MERGE` command syntax are all correct for current RedisBloom versions (2.4+).
- The default compression value of 100 for `TDIGEST.CREATE` is correctly stated.
- The `TDIGEST.ADD` syntax uses the modern (RedisBloom 2.4+) format without explicit weights, which is correct.
- Example output values are approximate and typical of T-Digest behavior, though exact values may vary depending on the RedisBloom version and internal interpolation algorithm. Readers running these commands may see slightly different numeric results.
- The accuracy table provides rough guidelines for T-Digest error characteristics. Note that the error ordering between P1/P99 and P0.1/P99.9 rows is debatable — T-Digest theory suggests more extreme quantiles have better rank accuracy, but value-relative error depends on data distribution. The general message (T-Digest is most accurate at tails, least at median) is correct.
- The rolling window approach with TTL-based keys and the SLA monitoring workflow are sound architectural patterns.
