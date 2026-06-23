# Validation Summary: How to Configure Zookeeper for Coordination

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache ZooKeeper 3.9.1
- ZooKeeper ensemble configuration (`zoo.cfg`)
- ZooKeeper CLI (`zkCli.sh`)
- ZooKeeper four-letter-word commands
- ZooKeeper SASL / JAAS authentication
- systemd service configuration
- Python Kazoo client
- Java ZooKeeper client API

## Sources Consulted
- Apache ZooKeeper 3.9.1 Administrator's Guide: https://zookeeper.apache.org/doc/r3.9.1/zookeeperAdmin.html
- Apache ZooKeeper 3.9.1 CLI documentation: https://zookeeper.apache.org/doc/r3.9.1/zookeeperCLI.html
- Apache ZooKeeper 3.9.1 Programmer's Guide: https://zookeeper.apache.org/doc/r3.9.1/zookeeperProgrammers.html
- Apache ZooKeeper 3.9.1 Java API documentation: https://zookeeper.apache.org/doc/r3.9.1/apidocs/zookeeper-server/org/apache/zookeeper/ZooKeeper.html
- Kazoo client API documentation: https://kazoo.readthedocs.io/en/latest/api/client.html
- Kazoo watcher recipe documentation: https://kazoo.readthedocs.io/en/latest/api/recipe/watchers.html
- Apache ZooKeeper archived 3.9.1 binary distribution: https://archive.apache.org/dist/zookeeper/zookeeper-3.9.1/apache-zookeeper-3.9.1-bin.tar.gz

## Issues Found
- The ZooKeeper 3.9.1 download command used `downloads.apache.org`, where the specific 3.9.1 artifact is no longer available. Changed it to Apache's official archive URL so the pinned version downloads successfully.
- The `zoo.cfg` example later used the `cons` four-letter-word command but did not include `cons` in `4lw.commands.whitelist`. Added `cons` so the monitoring command works on ZooKeeper versions where four-letter-word commands are restricted by the whitelist.
- The sequential znode example created `/myapp/workers/worker-` without first creating the `/myapp/workers` parent znode. Added `create /myapp/workers ""` before the sequential create command.
- The Python `set_config` method updated ZooKeeper but left the local cache stale if the key was already cached. Updated it to refresh `config_cache` after writes.
- The Java watch callback called `getConfig(key)`, which returned a cached value and could notify listeners with stale data after an external znode update. Changed the callback to fetch the changed znode data directly from ZooKeeper, update the cache, and then notify listeners.
- The Java example used the platform default charset in some byte/string conversions. Updated the example to use `StandardCharsets.UTF_8` consistently.
- The SASL section only showed a server JAAS context and used a shell `export` that would not configure the systemd-managed ZooKeeper process. Added a matching `Client` JAAS context and changed the startup instruction to a systemd `Environment` line for `SERVER_JVMFLAGS`.

## Review Notes
- The guide remains version-specific to ZooKeeper 3.9.1. The pinned version is no longer served from the primary Apache downloads mirror, but it is still available from the official Apache archive.
- The examples use `ZooDefs.Ids.OPEN_ACL_UNSAFE` for brevity. That is syntactically correct, but production deployments should use appropriate ACLs, especially once SASL authentication is enabled.
