# Validation Summary: How to Build a Real-Time A/B Test Results Dashboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, GET, PIPELINE commands)
- Python 3 (redis-py client library)
- hashlib (MD5 for deterministic variant assignment)
- Statistics (two-proportion z-test for A/B test significance)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis INCR command documentation: https://redis.io/commands/incr/
- Redis PIPELINE documentation: https://redis.io/docs/latest/develop/use/pipelining/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Two-proportion z-test formula reference (standard statistical methodology for comparing two proportions)

## Issues Found
1. **Inaccurate summary claim about PIPELINE usage**: The summary stated "Hash-based dashboards read all variant data in a single PIPELINE call, keeping the dashboard API fast regardless of experiment count." The code actually creates a separate pipeline per variant (each batching 2 GET commands), not a single pipeline for all variants. Additionally, the function operates on a single experiment, so "regardless of experiment count" was misleading. Fixed to: "PIPELINE calls batch reads per variant, keeping the dashboard API fast."

## Review Notes
- The `get_experiment_dashboard` function could be optimized to use a single pipeline for all variants instead of one pipeline per variant, reducing network round trips. This is a potential improvement but the current code is functionally correct.
- `hashlib.md5()` is appropriate for non-cryptographic variant bucketing. On FIPS-compliant Python builds (Python 3.9+), `hashlib.md5(usedforsecurity=False)` may be needed, but this is a deployment-specific concern not relevant to most readers.
- The `assign_variant` function does not guard against an empty `variants` list, which would cause a `ZeroDivisionError`. This is a minor edge case acceptable in a tutorial context.
