# Validation Summary: How to Use SELECT in Redis to Switch Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SELECT command, database management, configuration)
- Redis Cluster (limitations noted)
- Redis Sentinel (mentioned as compatible deployment)

## Sources Consulted
- Redis SELECT command documentation: https://redis.io/docs/latest/commands/select/
- Redis configuration documentation (databases directive): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis Cluster specification (database 0 only): https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis FLUSHDB / FLUSHALL command documentation: https://redis.io/docs/latest/commands/flushdb/

## Issues Found
No technical issues found.

## Review Notes
- The statement "SELECT in Cluster mode returns an error" is technically only true for non-zero indexes; `SELECT 0` succeeds in Cluster mode. In the context of the post (switching databases), this is acceptable and not misleading.
- The post does not mention `MOVE` or `SWAPDB` commands, which do operate across databases. However, the claim that "data in different databases cannot be accessed together in a single command" is still accurate since those commands transfer/swap rather than read across databases simultaneously.
- The `redis` code fence language is used for both CLI commands and the `redis.conf` configuration snippet. This is a minor stylistic inconsistency but not a technical error.
- The post's recommendation to prefer key prefixes over multiple databases aligns with the broader Redis community consensus and official guidance.
