# Validation Summary: How to Use CLUSTER FAILOVER in Redis for Manual Failover

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Cluster
- CLUSTER FAILOVER command (default, FORCE, TAKEOVER modes)
- Redis CLUSTER INFO command
- Redis ROLE command
- redis-cli

## Sources Consulted
- Official Redis CLUSTER FAILOVER documentation: https://redis.io/docs/latest/commands/cluster-failover/
- Official Redis ROLE documentation: https://redis.io/docs/latest/commands/role/
- Official Redis CLUSTER INFO documentation: https://redis.io/docs/latest/commands/cluster-info/

## Issues Found
No technical issues found.

## Review Notes
- The ROLE command output is shown in JSON-like notation (`["master", 0, [...]]`) within a comment. While redis-cli actually outputs RESP-formatted text (numbered lines), the simplified notation correctly conveys the structure and is acceptable as illustrative shorthand in a comment.
- The replication offset of `0` in the ROLE example is technically valid for a freshly promoted master, though in practice the offset is usually a larger integer. This is defensible in context since the example shows a node immediately after promotion.
- The default failover description could note that the replica obtains authorization from a majority of masters before promoting (not a unilateral self-promotion), but the current description accurately captures the high-level behavior without being misleading.
- The FORCE mode description accurately notes it requires a majority of masters for authorization, which distinguishes it from TAKEOVER.
