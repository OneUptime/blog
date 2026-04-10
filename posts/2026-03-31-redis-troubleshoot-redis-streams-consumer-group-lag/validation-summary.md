# Validation Summary: How to Troubleshoot Redis Streams Consumer Group Lag

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis Streams (consumer groups, pending entries, autoclaim)
- Redis CLI commands: XINFO GROUPS, XLEN, XPENDING, XAUTOCLAIM, XADD, XACK, XINFO CONSUMERS, XGROUP DELCONSUMER, XREADGROUP, XTRIM
- Python redis-py client library

## Sources Consulted
- Redis official documentation for XINFO GROUPS (https://redis.io/commands/xinfo-groups/)
- Redis official documentation for XPENDING (https://redis.io/commands/xpending/)
- Redis official documentation for XAUTOCLAIM (https://redis.io/commands/xautoclaim/)
- Redis official documentation for XREADGROUP (https://redis.io/commands/xreadgroup/)
- Redis official documentation for XGROUP DELCONSUMER (https://redis.io/commands/xgroup-delconsumer/)
- Redis official documentation for XTRIM (https://redis.io/commands/xtrim/)
- redis-py library source and documentation for xreadgroup method signature

## Issues Found
1. **XPENDING comment mislabeled**: The command `XPENDING my-stream my-group - + 10` was commented as "Show pending summary" but this is the range/detailed form, not the summary form. The actual summary form is `XPENDING my-stream my-group` (without range arguments), which returns total pending count, min/max IDs, and per-consumer counts. Fixed by adding the correct summary command and relabeling the existing commands with accurate comments.

## Review Notes
- The `lag` and `entries-read` fields in `XINFO GROUPS` were introduced in Redis 7.0. The post does not mention a minimum Redis version, which could cause confusion for users on older versions.
- The `lag` field can return NULL when the value cannot be determined (e.g., if entries-read is not tracked). The post does not mention this edge case.
- All other commands, code examples, and technical explanations are accurate and use correct syntax.
- The Python redis-py code correctly uses `xreadgroup` and `xack` with proper parameter names.
