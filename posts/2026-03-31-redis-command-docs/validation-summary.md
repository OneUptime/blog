# Validation Summary: How to Use COMMAND DOCS in Redis to Get Command Help

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 7.0+
- COMMAND DOCS command
- COMMAND INFO command
- redis-cli

## Sources Consulted
- Official Redis COMMAND DOCS documentation: https://redis.io/docs/latest/commands/command-docs/
- Official Redis COMMAND INFO documentation: https://redis.io/docs/latest/commands/command-info/
- Official Redis GETSET documentation: https://redis.io/docs/latest/commands/getset/
- Official Redis LMPOP documentation: https://redis.io/docs/latest/commands/lmpop/

## Issues Found
1. **COMMAND INFO availability version was incorrect.** The comparison table stated COMMAND INFO has been available since "Redis 1.0". According to official Redis documentation, COMMAND INFO was introduced in Redis 2.8.13. Fixed the table entry from "Redis 1.0" to "Redis 2.8.13".

## Review Notes
- The COMMAND DOCS output fields table is accurate but does not mention two additional fields that exist in the actual response: `deprecated_since` and `history`. This is acceptable since the post focuses on the most commonly useful fields and doesn't claim to be exhaustive.
- The example output for `COMMAND DOCS set` is marked as abbreviated, which is appropriate since the actual output is considerably more verbose.
- The `grep` piping examples (`grep since`, `grep -A1 "complexity"`) work correctly with redis-cli output format.
