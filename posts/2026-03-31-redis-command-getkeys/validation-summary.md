# Validation Summary: How to Use COMMAND GETKEYS in Redis to Extract Keys from Commands

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (COMMAND GETKEYS subcommand)
- Redis Cluster (hash slots, CROSSSLOT errors, hash tags)
- Python (redis-py client usage example)

## Sources Consulted
- Official Redis COMMAND GETKEYS documentation: https://redis.io/docs/latest/commands/command-getkeys/
- Official Redis COMMAND documentation: https://redis.io/docs/latest/commands/command/
- Redis Cluster specification (hash slot range 0-16383, CROSSSLOT behavior)
- Official Redis EVAL documentation (numkeys argument behavior)
- Official Redis SORT documentation (STORE option key extraction)

## Issues Found
No technical issues found.

All eight core claims were verified against official Redis documentation:

1. **Syntax** (`COMMAND GETKEYS command [arg [arg ...]]`) matches official docs exactly.
2. **SET example** returning `"foo"` is correct — SET's first argument is the key.
3. **MSET example** returning `"key1"` and `"key2"` is correct — MSET keys are at every other position.
4. **ZADD example** returning `"leaderboard"` is correct — ZADD's first argument is the key.
5. **MGET example** returning all three keys is correct.
6. **EVAL example** with numkeys=1 returning `"mykey"` is correct — matches official docs' EVAL example pattern.
7. **SORT with STORE** returning both `"mylist"` and `"destkey"` is correct — official docs show the same behavior.
8. **Cluster hash slot range** (0-16383) and **CROSSSLOT error** behavior are accurate.
9. **COMMAND INFO vs COMMAND GETKEYS distinction** (static metadata vs actual key resolution) is correctly described.
10. **Python code snippet** using `execute_command('COMMAND', 'GETKEYS', *command_parts)` is a valid redis-py invocation.

## Review Notes
- The post does not mention the Redis version that introduced COMMAND GETKEYS (2.8.13). This could be a helpful addition for readers targeting older Redis versions.
- As of Redis 7.0, key specifications in COMMAND DOCS can replace COMMAND GETKEYS for most commands. The only commands that still require COMMAND GETKEYS are SORT and MIGRATE. The post could mention this for readers on Redis 7.0+.
- A related command, COMMAND GETKEYSANDFLAGS (introduced in Redis 7.0), provides similar functionality with additional per-key flag information. This is not mentioned but could be a useful reference.
- The post's content is accurate and well-structured as-is; these are optional enhancements, not corrections.
