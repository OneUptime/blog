# Validation Summary: How to Use XINFO GROUPS in Redis to List Consumer Groups

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Streams
- XINFO GROUPS command
- Consumer Groups (XREADGROUP, XGROUP SETID)
- XLEN command
- XINFO CONSUMERS command

## Sources Consulted
- Official Redis documentation for XINFO GROUPS: https://redis.io/docs/latest/commands/xinfo-groups/
- Official Redis documentation for Redis Streams: https://redis.io/docs/latest/develop/data-types/streams/

## Issues Found

1. **"last acknowledged ID" should be "last delivered ID"** (How XINFO GROUPS Works section): The field is `last-delivered-id`, not a last-acknowledged ID. Changed "last acknowledged ID" to "last delivered ID" to match Redis terminology.

2. **`consumers` field described as "active" consumers**: The official docs describe this as "the number of consumers in the group" without an "active" qualifier. Removed "active" from the description.

3. **`entries-read` description was inaccurate**: The post said "total messages consumed since group creation." The official docs define it as "the logical read counter of the last entry delivered to the group's consumers," which is subtly different — it is not a simple running total, and the distinction matters when entries have been deleted from the stream. Updated the description.

4. **`lag` field missing NULL caveat**: The post omitted that `lag` can be NULL when Redis cannot determine the value (e.g., when a consumer group is created with an arbitrary last-delivered-id, or when entries have been deleted via XDEL or trimming). Added this caveat.

5. **Mermaid diagram conflated `last-delivered-id` with `entries-read`**: The diagram labeled nodes as `last-delivered-id = 980` and `last-delivered-id = 1250`, but `last-delivered-id` is a stream ID (timestamp-sequence format like `1711900450000-0`), not an integer count. The integer values 980 and 1250 correspond to `entries-read` from the example output. Changed diagram labels to reference `entries-read` instead.

## Review Notes
- The `entries-read` and `lag` fields were introduced in Redis 7.0.0. The post does not mention this version requirement, which could be relevant for readers on older Redis versions. This is not an error but could be a useful addition in a future update.
- The syntax, command usage, example output format, and field ordering are all accurate per the official Redis documentation.
