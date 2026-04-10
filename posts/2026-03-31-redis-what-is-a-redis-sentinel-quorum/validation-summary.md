# Validation Summary: What Is a Redis Sentinel Quorum

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Sentinel
- Redis (primary-replica replication)
- Python redis-py client library

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/management/sentinel/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/en/stable/sentinel.html
- Redis CLI command reference for Sentinel subcommands: https://redis.io/commands/?group=sentinel

## Issues Found
1. **Misleading quorum explanation (line 41)**: The original text stated "both Sentinel B and C must also see the primary as unreachable before failover proceeds." With quorum=2 out of 3 Sentinels, only **one** additional Sentinel needs to agree (any 2 total), not both. The word "both" incorrectly implied all 3 Sentinels must agree. Fixed to clarify that at least one other Sentinel must confirm, and explained why the scenario (only Sentinel A having a network issue) still prevents false failover since neither B nor C would confirm.

## Review Notes
- The `SENTINEL SLAVES` command (line 116) still works but has been renamed to `SENTINEL REPLICAS` since Redis 6.2 (2021). Both are valid; `REPLICAS` is the preferred form in current documentation.
- The `slave_for()` method in redis-py (line 147) also works but newer versions of redis-py may offer `replica_for()` as the preferred name. Both are functional.
- The post correctly explains the distinction between quorum (for ODOWN detection) and majority (for failover authorization). One nuance not covered: if quorum is set higher than the majority, the authorization threshold becomes `max(quorum, majority)` rather than just majority. This is a minor omission that doesn't affect the post's recommended configurations (where quorum equals majority).
- All configuration directives, CLI commands, and the Python code example are syntactically correct and functional.
- The CKQUORUM output examples are illustrative approximations; exact wording may vary by Redis version, but the concepts are accurately conveyed.
