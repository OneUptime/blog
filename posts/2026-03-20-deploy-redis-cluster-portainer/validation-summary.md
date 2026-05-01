# Validation Summary: How to Deploy Redis Cluster via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Redis 7.2
- Redis Cluster
- Redis Sentinel
- Node.js
- ioredis

## Sources Consulted
- Redis Cluster documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis example configuration (`redis.conf`): https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis example Sentinel configuration (`sentinel.conf`): https://raw.githubusercontent.com/redis/redis/unstable/sentinel.conf
- Portainer, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer, Relative path support: https://docs.portainer.io/advanced/relative-paths
- Compose Specification, version top-level element: https://compose-spec.github.io/compose-spec/04-version-and-name.html
- ioredis README: https://github.com/redis/ioredis

## Issues Found
- The post said a Redis Cluster minimum is 6 nodes. Redis documents 3 primary nodes as the minimum cluster that works as expected, while 6 nodes with 3 replicas is the recommended deployment shape. I corrected that distinction.
- The original Portainer stack relied on a relative bind mount for `./redis-cluster.conf`. Portainer documents relative-path bind mounts only for specific Git-based Business Edition workflows, so the stack as written was not reliable for the normal web-editor flow. I removed that dependency and passed the Redis settings inline.
- The original stack also remapped host ports for each node without configuring `cluster-announce-ip`, `cluster-announce-port`, and `cluster-announce-bus-port`. Redis documents that Docker/NAT and port-forwarded cluster deployments need explicit announce settings. I corrected this by switching the post to an internal Docker-network deployment model using service names, which matches the rest of the Portainer examples in the post.
- The original Redis config snippet used `cluster-config-file nodes.conf` without pinning it to the persistent data volume. Redis persists cluster state in this file, so I updated the example to use `/data/nodes.conf` and added `dir /data` to keep cluster metadata on the named volume.
- The cluster creation, verification, and application examples mixed container exec with host-published ports and `<HOST_IP>` addressing. That was inconsistent with Docker-networked Redis Cluster behavior. I updated those examples to use `redis-1` through `redis-6` as cluster seed nodes and corrected the Node.js `ioredis` sample accordingly.
- The application environment comment said “cluster mode URLs” while the example actually provided a node seed list. I corrected the explanation to match what the sample shows.
- The Sentinel alternative used a `sentinel.conf` path without mounting any configuration file, and it implied a single Sentinel instance was enough for a robust deployment. Redis Sentinel requires a writable config file and recommends at least three Sentinel instances for a robust deployment. I updated the example and conclusion to reflect that.
- The Compose example included the obsolete top-level `version: "3.8"` key. Current Compose specification documentation marks that field as obsolete, so I removed it.

## Review Notes
- The post is now technically consistent for a Redis Cluster that stays on the Docker network created by the Portainer stack. If readers need clients outside Docker to connect to the cluster, the post would need a different pattern using published ports plus per-node `cluster-announce-*` settings.
- The `redis:7.2-alpine` image tag floats to the latest Redis 7.2 patch release rather than pinning an exact patch version.
- I validated all YAML code blocks locally with a YAML parser and syntax-checked the Node.js snippet. Runtime execution of the `ioredis` example was not possible in this workspace because `ioredis` is not installed here.
