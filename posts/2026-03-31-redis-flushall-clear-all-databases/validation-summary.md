# Validation Summary: How to Use FLUSHALL in Redis to Clear All Databases

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (core server commands)
- Redis FLUSHALL command
- Redis ACLs (Access Control Lists)
- Redis persistence (RDB and AOF)
- Redis `rename-command` configuration

## Sources Consulted
- Official Redis FLUSHALL documentation: https://redis.io/docs/latest/commands/flushall/
- Official Redis ACL documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Official Redis security documentation (rename-command deprecation)
- Official Redis FLUSHDB documentation (for comparison claims)

## Issues Found

### 1. Incorrect RDB persistence behavior
- **What was wrong:** The post stated "The next `BGSAVE` will write an empty or near-empty RDB file. Previous snapshots on disk are not deleted." This implies FLUSHALL passively waits for the next BGSAVE to reflect the cleared state.
- **What was changed:** Corrected to state that FLUSHALL actively clears the current RDB file, aborts any in-progress snapshot, and immediately writes an empty RDB file if the `save` configuration is enabled. This matches the official Redis documentation.
- **Why:** The official docs explicitly state that FLUSHALL "clears the RDB persistence file, aborts any snapshot that is in progress, and, if the save config is enabled, saves an empty RDB file." The original wording was misleading about when the RDB file gets updated.

### 2. Missing deprecation notice for rename-command
- **What was wrong:** The post presented `rename-command FLUSHALL ""` as a current, recommended approach without noting it is deprecated.
- **What was changed:** Added a note that `rename-command` is deprecated and may be removed in a future Redis version, and that ACLs are the preferred approach.
- **Why:** The official Redis security documentation explicitly warns that rename-command "may be removed in future versions" and directs users to ACL rules instead. Presenting it without this caveat could lead readers to adopt a deprecated pattern.

## Review Notes
- The ACL example uses per-command exclusion (`-FLUSHALL -FLUSHDB -CONFIG`), which is valid syntax. The official docs tend to recommend the category-based approach (`-@dangerous`) which covers FLUSHALL and other risky commands in one rule. Both are correct; the category approach is more maintainable.
- Starting with Redis 6.2, the `lazyfree-lazy-user-flush` configuration directive can change the default FLUSHALL behavior (with no argument) from synchronous to asynchronous. The post doesn't mention this, which is fine for a focused tutorial but worth noting for completeness.
- The AOF behavior description is accurate based on standard Redis AOF semantics, though the official FLUSHALL command page does not explicitly document this interaction.
