# Validation Summary: How to Configure Redis Cluster on IPv4 Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Open Source / Redis Cluster
- Redis CLI (`redis-cli`)
- Redis configuration (`redis.conf`)
- Linux firewall rules with `iptables`
- Python (`redis-py`)
- Node.js (`ioredis`)

## Sources Consulted
- Redis Cluster management docs: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- `CLUSTER KEYSLOT` command docs: https://redis.io/docs/latest/commands/cluster-keyslot/
- `CLUSTER NODES` command docs: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis replication docs (`masterauth`): https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis ACL docs (`requirepass` compatibility note): https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis Linux install docs (`redis-server` vs `redis` service names): https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- redis-py clustering docs: https://redis.readthedocs.io/en/stable/clustering.html
- ioredis cluster docs: https://github.com/redis/ioredis

## Issues Found
- The post used `sudo systemctl restart redis` while the post’s config path (`/etc/redis/redis.conf`) matches the Debian/Ubuntu packaging shown in Redis docs, where the service name is `redis-server`. Updated the restart command to `sudo systemctl restart redis-server`.
- The verification note for `CLUSTER KEYSLOT` was incorrect. That command returns the hash slot for a key; it does not directly identify the owning node. Updated the description to reflect the actual command behavior.
- The Python `redis-py` cluster example used an outdated `startup_nodes` format with dictionaries. Current official `redis-py` cluster docs use either `host`/`port` or `ClusterNode` objects. Updated the example to use `ClusterNode(...)`.

## Review Notes
- The Redis server configuration is broadly correct for a basic IPv4 cluster: `cluster-enabled yes`, `cluster-config-file`, `cluster-node-timeout`, `appendonly yes`, and opening both the client and cluster bus ports all align with official Redis Cluster documentation.
- `requirepass` still works, but Redis 6+ recommends ACL-based authentication for newer deployments. The post is still technically valid because `requirepass` remains backward-compatible and `masterauth` is valid for replica authentication.
- Redis docs recommend `REDISCLI_AUTH` instead of `-a` when passing passwords to `redis-cli` from the shell, for better security. The commands in the post remain valid as written.
- The Node.js `ioredis` cluster example is valid, though the ioredis project notes that `node-redis` is the recommended choice for new projects.
