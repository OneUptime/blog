# Validation Summary: How to Use ACL DELUSER in Redis to Remove Users

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (ACL system, specifically ACL DELUSER command)
- Redis Access Control Lists (ACL DELUSER, ACL LIST, ACL GETUSER, ACL SAVE, ACL LOAD)
- Redis CLIENT KILL command

## Sources Consulted
- Official Redis ACL DELUSER documentation: https://redis.io/docs/latest/commands/acl-deluser/
- Official Redis CLIENT KILL documentation: https://redis.io/docs/latest/commands/client-kill/
- Official Redis ACL SAVE documentation: https://redis.io/docs/latest/commands/acl-save/
- Official Redis ACL LOAD documentation: https://redis.io/docs/latest/commands/acl-load/

## Issues Found

### 1. Incorrect claim about active connections not being terminated (Critical)
- **What was wrong:** The post stated that "Existing connections authenticated as the deleted user are not immediately terminated" and framed `CLIENT KILL USER` as a necessary follow-up step. This was true for Redis 6.0.x but is incorrect for Redis 6.2+, where `ACL DELUSER` automatically terminates all connections authenticated as the deleted user.
- **What was changed:** Updated the Overview, the "Active connections" section, the workflow example, the mermaid flowchart, and the Summary to reflect that connections are terminated automatically since Redis 6.2. Retained mention of `CLIENT KILL USER` as needed only for pre-6.2 versions.
- **Why:** The official Redis documentation for ACL DELUSER explicitly states: "This command deletes all the specified ACL users and terminates all the connections that are authenticated with such users." This behavior was introduced in Redis 6.2.

## Review Notes
- The syntax, return values, and behavior for non-existing users are all accurate per current Redis documentation.
- The error message for attempting to delete the default user (`ERR The 'default' user cannot be removed`) is consistent with Redis conventions, though the exact wording is not documented on the official page.
- The `ACL SAVE` and `ACL LOAD` guidance is correct.
- The mermaid diagrams are well-structured and now accurately reflect the corrected behavior.
