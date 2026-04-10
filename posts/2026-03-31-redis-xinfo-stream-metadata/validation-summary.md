# Validation Summary: How to Use XINFO STREAM in Redis to Inspect Stream Metadata

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Streams
- XINFO STREAM command
- Redis CLI

## Sources Consulted
- Official Redis documentation for XINFO STREAM: https://redis.io/docs/latest/commands/xinfo-stream/

## Issues Found
No technical issues found.

All verified claims:
- Syntax `XINFO STREAM key [FULL [COUNT count]]` is correct.
- All 10 default output fields (`length`, `radix-tree-keys`, `radix-tree-nodes`, `last-generated-id`, `max-deleted-entry-id`, `entries-added`, `recorded-first-entry-id`, `groups`, `first-entry`, `last-entry`) are accurate and shown in the correct order.
- The `groups` field is correctly described as an integer count of consumer groups in the default (non-FULL) form.
- The default COUNT value of 10 in FULL mode is correct per official docs.
- The ID format `<millisecond-timestamp>-<sequence>` is accurate.
- The description of `last-generated-id` as "the highest ID ever assigned (monotonically increasing)" is correct.
- The description of `entries-added` as including deleted entries is correct.

## Review Notes
- The fields `max-deleted-entry-id`, `entries-added`, and `recorded-first-entry-id` were added in Redis 7.0. The post does not mention this version requirement, which is acceptable since Redis 7.x is the current major release, but could be noted for readers on older versions.
- The `FULL` modifier was added in Redis 6.0. Readers on Redis 5.x would not have access to it.
