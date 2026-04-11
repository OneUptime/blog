# Validation Summary: How to Use CLUSTER SAVECONFIG in Redis to Persist Cluster Config

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Cluster
- CLUSTER SAVECONFIG command
- CLUSTER SETSLOT command
- CLUSTER ADDSLOTS command
- CLUSTER MEET command
- redis-cli
- nodes.conf cluster configuration file

## Sources Consulted
- Redis official documentation for CLUSTER SAVECONFIG: https://redis.io/docs/latest/commands/cluster-saveconfig/
- Redis official documentation for CLUSTER NODES (format reference): https://redis.io/docs/latest/commands/cluster-nodes/
- Redis Cluster scaling guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification (config file persistence, bus port convention): https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

## Issues Found
No technical issues found.

## Review Notes
- The claim that Redis writes the config on "server shutdown" is a reasonable inference but not explicitly stated in the cluster specification. The docs specifically mention writes triggered by configEpoch/currentEpoch changes and message reception. This is not incorrect — clean shutdown does persist state — but it is worth noting the docs focus on epoch-driven triggers.
- All command syntax (`CLUSTER SAVECONFIG`, `CLUSTER SETSLOT`, `CLUSTER MEET`, `CLUSTER ADDSLOTS`) is correct and matches current official documentation.
- The nodes.conf format example correctly matches the CLUSTER NODES serialization format documented by Redis.
- The bus port convention (base port + 10000, e.g., 7001 -> 17001) is correctly stated per the cluster specification.
- The `cluster-config-file` directive and default value of `nodes.conf` are accurate.
