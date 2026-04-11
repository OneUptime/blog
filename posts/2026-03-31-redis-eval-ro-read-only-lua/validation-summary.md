# Validation Summary: How to Use EVAL_RO in Redis for Read-Only Lua Scripts

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (7.0+)
- EVAL_RO command
- EVALSHA_RO command
- Lua scripting in Redis
- Redis replicas and ACL

## Sources Consulted
- Official Redis EVAL_RO documentation: https://redis.io/docs/latest/commands/eval_ro/
- Official Redis EVALSHA_RO documentation: https://redis.io/docs/latest/commands/evalsha_ro/

## Issues Found
1. **Incorrect error message format (line 85)**: The error message comment read `-- ERR: ERR Write commands not allowed from read-only scripts.` which had a redundant `ERR:` prefix (double ERR) and was missing the word "are". Fixed to `-- (error) ERR Write commands are not allowed from read-only scripts.` to match the actual Redis error output format.
2. **Missing word in sequence diagram error (line 101)**: The sequence diagram error message read `ERR Write commands not allowed from read-only scripts.` — missing the word "are". Fixed to `ERR Write commands are not allowed from read-only scripts.` to match the actual Redis error message.

## Review Notes
- The post does not mention that EVAL_RO was introduced in Redis 7.0.0. Readers using older Redis versions will encounter errors. This is worth noting but does not constitute a technical inaccuracy in the existing content.
- The flowchart describes "Script analysis at runtime" which slightly implies pre-execution analysis. In reality, Redis enforces the read-only constraint command-by-command as the script executes (not by pre-analyzing the script). The end result is the same, so this is an acceptable simplification for a blog post.
- The "Runs on replicas" row for EVAL states "No (unless `replica-read-only no`)" which is a simplification. In standalone mode, EVAL can run read-only scripts on replicas. The main issue is in Redis Cluster READONLY mode where EVAL gets redirected to the primary. The simplification is reasonable for the target audience.
- The SCRIPT LOAD SHA1 hash shown is illustrative — readers will get their own hash value, which is fine.
- All listed read-only commands in the "Allowed Commands" section are accurate Redis read commands.
