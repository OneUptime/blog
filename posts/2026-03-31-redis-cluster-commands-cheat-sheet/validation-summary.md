# Validation Summary: Redis Cluster Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis Cluster (including Redis 7.0+ commands)
- redis-cli command-line tool

## Sources Consulted
- Redis CLUSTER INFO documentation: https://redis.io/commands/cluster-info
- Redis CLUSTER NODES documentation: https://redis.io/commands/cluster-nodes
- Redis CLUSTER MYID documentation: https://redis.io/commands/cluster-myid
- Redis CLUSTER KEYSLOT documentation: https://redis.io/commands/cluster-keyslot
- Redis CLUSTER ADDSLOTSRANGE documentation: https://redis.io/commands/cluster-addslotsrange
- Redis CLUSTER DELSLOTSRANGE documentation: https://redis.io/commands/cluster-delslotsrange
- Redis CLUSTER SETSLOT documentation: https://redis.io/commands/cluster-setslot
- Redis CLUSTER FAILOVER documentation: https://redis.io/commands/cluster-failover
- Redis CLUSTER RESET documentation: https://redis.io/commands/cluster-reset
- Redis CLUSTER LINKS documentation: https://redis.io/commands/cluster-links
- Redis MIGRATE documentation: https://redis.io/commands/migrate
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/

## Issues Found
1. **Incorrect comment for CLUSTER MYID**: The comment above the command read "List nodes in a compact format", which is wrong. CLUSTER MYID returns the current node's own unique ID, not a list of nodes. Fixed the comment to "Get this node's unique ID".

2. **Invalid piping in Redis command**: `CLUSTER INFO | grep cluster_current_epoch` was presented as a Redis command, but piping is a shell operation and does not work inside redis-cli. Fixed to `redis-cli CLUSTER INFO | grep cluster_current_epoch` with a comment noting it should be run from the shell.

## Review Notes
- All Redis Cluster commands (CLUSTER INFO, NODES, KEYSLOT, COUNTKEYSINSLOT, GETKEYSINSLOT, ADDSLOTS, ADDSLOTSRANGE, DELSLOTS, DELSLOTSRANGE, FLUSHSLOTS, MEET, FORGET, REPLICATE, RESET, FAILOVER, SETSLOT, LINKS) are verified as correct with proper syntax.
- The ADDSLOTSRANGE, DELSLOTSRANGE, and LINKS commands are correctly noted as Redis 7.0+ features.
- The MIGRATE command syntax is correct: `MIGRATE host port key destination-db timeout`.
- The redis-cli --cluster subcommands (reshard, check, fix, info) are all correct with proper flag usage.
- Hash tag explanation using `{user:42}` is accurate — keys sharing the same hash tag are guaranteed to map to the same slot.
- The 16384 hash slot count is correct.
- The CLUSTER RESET behavior description (SOFT keeps node ID, HARD generates new) is accurate.
