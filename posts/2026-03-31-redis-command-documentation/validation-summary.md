# Validation Summary: How to Use COMMAND in Redis to Get Command Documentation

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (COMMAND, COMMAND INFO, COMMAND COUNT, COMMAND DOCS subcommands)
- redis-cli

## Sources Consulted
- Redis official documentation for COMMAND: https://redis.io/docs/latest/commands/command/
- Redis official documentation for COMMAND INFO: https://redis.io/docs/latest/commands/command-info/
- Redis official documentation for COMMAND COUNT: https://redis.io/docs/latest/commands/command-count/
- Redis official documentation for COMMAND DOCS: https://redis.io/docs/latest/commands/command-docs/
- Redis official documentation for SET, GET, PING, MSET, FLUSHALL commands

## Issues Found
1. **Line 103 — "dangerous flag" should be "@dangerous ACL category"**: The post originally stated that `COMMAND INFO flushall` returns the `dangerous` flag. In Redis, `@dangerous` is an ACL category (returned at position 7 in the COMMAND output for Redis 7.0+), not a command flag (position 3). Command flags include values like `write`, `readonly`, `denyoom`, `admin`, `fast`, etc. The text was corrected from "the `dangerous` flag among others" to "the `@dangerous` ACL category among others".

## Review Notes
- The output structure section describes the original 6-field format from COMMAND output. In Redis 7.0+, the COMMAND response includes additional fields (ACL categories at position 7, tips at position 8, key specifications at position 9, subcommands at position 10). This is not incorrect but could be expanded in a future revision for completeness.
- COMMAND DOCS was introduced in Redis 7.0.0. The post does not note this version requirement. A future revision could mention the minimum Redis version.
- The "Listing Command Names" section title is slightly misleading since it shows COMMAND DOCS (which returns full documentation) rather than COMMAND LIST (Redis 7.0+), which is specifically designed for listing command names. This is a stylistic/organizational note rather than a technical error.
- All arity values (PING=-1, GET=2, SET=-3, MSET=-3) verified as correct against official documentation.
- The SET command example output (arity, flags, key positions) is accurate.
