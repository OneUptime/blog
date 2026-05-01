# Validation Summary: How to Deploy a MySQL Cluster with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Portainer
- Docker
- Docker Swarm
- MySQL replication
- ProxySQL
- OneUptime

## Sources Consulted
- MySQL 8.0 Reference Manual, Setting Up Replicas: https://dev.mysql.com/doc/mysql/8.0/en/replication-setup-replicas.html
- MySQL 8.0 Reference Manual, CHANGE REPLICATION SOURCE TO Statement: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual, SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual, Setting the Replica Configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-howto-slavebaseconfig.html
- MySQL 8.0 Reference Manual, Caching SHA-2 Pluggable Authentication: https://dev.mysql.com/doc/mysql/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL Security Guide, Native Pluggable Authentication: https://dev.mysql.com/doc/mysql-security-excerpt/8.0/en/native-pluggable-authentication.html
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, Overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs, Manage swarm service networks: https://docs.docker.com/engine/swarm/networking/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- ProxySQL Docs, First Steps After Installing: https://proxysql.com/documentation/getting-started/
- ProxySQL Docs, Configuring ProxySQL: https://proxysql.com/documentation/configuring-proxysql/
- ProxySQL Docs, How to Set Up ProxySQL Read/Write Split: https://proxysql.com/documentation/proxysql-read-write-split-howto/

## Issues Found
- The post metadata and description claimed Group Replication and a highly available cluster, but the content actually implemented asynchronous primary-replica replication. I changed the tags, description, and introductory wording so they match the deployment that the post shows.
- The replication commands used deprecated MySQL terminology and statements: `CHANGE MASTER TO`, `START SLAVE`, and `SHOW SLAVE STATUS`. I updated them to `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, and `SHOW REPLICA STATUS`, and I updated the related option and status field names to the current forms.
- The replication user was created with `mysql_native_password`, which MySQL documents as deprecated in 8.0, disabled by default in 8.4, and removed in 9.0. I changed the example to use the default authentication plugin and added `GET_SOURCE_PUBLIC_KEY=1`, which MySQL requires for `caching_sha2_password` over a non-TLS replication connection.
- The command examples used `docker exec -it` even though they run non-interactive `mysql -e` commands, and one command pipes output to `grep`. I changed them to `docker exec -i` to avoid unnecessary TTY allocation.
- The ProxySQL configuration snippet was incomplete for an `/etc/proxysql.cnf` bootstrap file because it omitted the basic top-level sections and also lacked `mysql_users`. I expanded it to a minimal working config-file structure, added `mysql_users`, and changed the rules so writes default to the primary while `SELECT` queries can be routed to replicas.
- The Swarm scaling section suggested increasing `deploy.replicas` on a single MySQL replica service. That is incorrect because MySQL replication requires each replica to have its own unique `server_id`, its own storage, and its own replication configuration. I rewrote the section to show adding a separate replica service and noted that Swarm deployments should use an `overlay` network rather than the standalone `bridge` network shown earlier.

## Review Notes
- The main stack example is now explicitly framed as a standalone Portainer stack. For true multi-node Docker Swarm deployments, networking and operations differ from standalone Compose-style stacks.
- This post still describes asynchronous primary-replica replication, not automatic failover or MySQL Group Replication. Readers who need automatic failover would need additional tooling or a different replication mode.
- ProxySQL's config file is a bootstrap mechanism for a fresh instance. After first start, ProxySQL prefers its on-disk SQLite configuration unless it is reinitialized or reloaded.
- Docker was not installed in this workspace, so the commands were validated against official documentation rather than executed locally.
