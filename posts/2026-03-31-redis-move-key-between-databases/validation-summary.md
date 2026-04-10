# Validation Summary: How to Use MOVE in Redis to Move a Key Between Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MOVE command)
- Redis logical databases (SELECT, database indexing)
- Redis key management (SET, GET, EXISTS, RPUSH, LRANGE, TTL)
- Redis Cluster (limitations context)

## Sources Consulted
- Redis official documentation for MOVE: https://redis.io/docs/latest/commands/move/
- Redis official documentation for SELECT: https://redis.io/docs/latest/commands/select/
- Redis official documentation for COPY: https://redis.io/docs/latest/commands/copy/
- Redis configuration reference (databases directive): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis Cluster specification (single database limitation): https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

## Issues Found
No technical issues found.

## Review Notes
- The COPY command mentioned in the Limitations section was introduced in Redis 6.2.0. The post does not claim universal availability, so this is fine, but readers on older Redis versions should be aware.
- The post correctly notes that MOVE is unavailable in Redis Cluster mode. This is an important caveat since Cluster deployments are increasingly common.
- All code examples are syntactically correct and produce the expected outputs as described.
- The mermaid diagrams accurately represent the MOVE command's behavior and decision flow.
