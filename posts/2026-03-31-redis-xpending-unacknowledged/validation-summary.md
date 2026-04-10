# Validation Summary: How to Use XPENDING in Redis to List Unacknowledged Messages

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Streams
- XPENDING command
- Consumer Groups (XREADGROUP, XACK)
- XCLAIM / XAUTOCLAIM for message recovery
- redis-cli

## Sources Consulted
- Official Redis XPENDING documentation: https://redis.io/docs/latest/commands/xpending/
- Official Redis XCLAIM documentation: https://redis.io/docs/latest/commands/xclaim/
- Official Redis Streams introduction: https://redis.io/docs/latest/develop/data-types/streams/

## Issues Found
1. **Incorrect Redis version for IDLE option**: The post stated that the `IDLE` filter was added in "Redis 7.0+" in two places (the syntax parameter list and the "Filter by Idle Time" section heading). According to the official Redis documentation, the `IDLE` option was actually added in **Redis 6.2.0**. Both occurrences were corrected to "Redis 6.2+".

## Review Notes
- The Syntax section label says "Summary form" but actually shows the full combined syntax (including the range form with optional brackets). This is slightly misleading but not technically incorrect since the summary form is the base syntax without the optional parameters.
- All command examples (`XPENDING`, `XCLAIM`, `XADD`, `XACK`) use correct syntax and argument ordering.
- The example output formats for both the summary and range forms accurately match Redis's actual response structure.
- The IDLE parameter is correctly placed before start/end/count in all examples.
- The mermaid diagram accurately represents the PEL lifecycle.
- The monitoring workflow and poison pill detection patterns are sound operational practices.
