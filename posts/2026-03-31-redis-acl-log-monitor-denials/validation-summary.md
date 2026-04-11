# Validation Summary: How to Use ACL LOG in Redis to Monitor Command Denials

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (ACL system, specifically ACL LOG command)
- Redis Access Control Lists (ACL)
- Redis security and monitoring

## Sources Consulted
- Official Redis ACL LOG documentation: https://redis.io/docs/latest/commands/acl-log/
- Redis 7.2 source code (`src/acl.c`) for ACL LOG implementation details
- Official Redis configuration documentation for `acllog-max-len`

## Issues Found

1. **Incorrect `COUNT` keyword in syntax**: The post used `ACL LOG [COUNT count | RESET]` and `ACL LOG COUNT 5`, but Redis does not have a `COUNT` keyword for this command. The correct syntax is `ACL LOG [count | RESET]` where `count` is a bare integer (e.g., `ACL LOG 5`). Fixed all instances including the syntax block, example, mermaid diagram, and summary paragraph.

2. **Wrong default behavior for no-args invocation**: The post stated that `ACL LOG` with no arguments "returns all recent log entries (up to `acllog-max-len`)". In reality, it returns at most 10 entries by default. Fixed to say "returns the most recent log entries (up to 10 by default)".

3. **Incorrect error message format for command denial**: The post showed `NOPERM this user has no permissions to run the 'set' command`, but the actual Redis error message format is `NOPERM User <username> has no permissions to run the 'set' command` (using the actual username, not "this user"). Fixed to use `User readonly_user`.

4. **Imprecise deduplication description**: The post stated entries are "deduplicated by username, command, and key". The actual deduplication criteria are reason, context, object, and username within a 60-second time window. Fixed to accurately describe the deduplication logic.

5. **Missing fields in the reference table**: The output example showed `entry-id`, `timestamp-created`, and `timestamp-last-updated` fields (added in Redis 7.2), but the field description table omitted them. Added these three fields with a "(Redis 7.2+)" note.

## Review Notes
- The four denial reasons (command, key, channel, auth) and four context values (toplevel, multi, lua, module) are all correct and complete.
- The `acllog-max-len` default of 128 is correct.
- The `ACL LOG RESET` returning OK is correct.
- The mermaid diagrams effectively illustrate the ACL denial flow and monitoring workflow.
- The channel denial example does not show user setup/auth context, which could confuse readers, but this is a minor presentation choice rather than a technical error.
