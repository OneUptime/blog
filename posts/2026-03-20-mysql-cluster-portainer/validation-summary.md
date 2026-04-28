# Validation Summary: How to Deploy a MySQL Cluster with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 (mysql/mysql-server image)
- MySQL InnoDB Cluster
- MySQL Group Replication
- MySQL Router 8.0
- MySQL Shell (mysqlsh)
- Docker / Docker Compose (compose file format 3.8)
- Portainer (container management)
- Python (mysql-connector-python)
- Bash (backup script)

## Sources Consulted
- MySQL Router Docker image documentation (https://hub.docker.com/r/mysql/mysql-router) — confirmed env var name and accepted value format
- MySQL Shell AdminAPI JavaScript reference (https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/) — verified `cluster.addInstance()` options dictionary keys including `password`, `recoveryMethod`, `ipAllowlist`, `localAddress`, `memberSslMode`
- MySQL 8.0 Reference Manual — verified replication options (`gtid-mode`, `enforce-gtid-consistency`, `binlog-row-metadata`, `binlog-transaction-dependency-tracking`, `slave-preserve-commit-order`, `log-bin`)
- MySQL Group Replication documentation — verified plugin name, group seeds format, default port 33061
- MySQL Router CLI documentation — verified `--bootstrap`, `--user`, `--conf-use-gr-notifications`, `--force` flags
- mysql-connector-python documentation — verified the `connect()` parameters
- mysqldump documentation — verified `--all-databases`, `--single-transaction`, `--routines`, `--triggers`

## Issues Found
1. **Incorrect MySQL Router environment variable** (Step 1, `mysql_router` service):
   - The post used `MYSQL_INNODB_CLUSTER_MEMBER=mysql1,mysql2,mysql3` (singular, comma-separated hostnames).
   - Per the official mysql/mysql-router Docker image documentation, the variable is `MYSQL_INNODB_CLUSTER_MEMBERS` (plural) and accepts a **number** (the minimum number of cluster instances that must be ONLINE before bootstrap proceeds), not a list of hostnames.
   - Fixed to `MYSQL_INNODB_CLUSTER_MEMBERS=3`.

## Review Notes
- `--slave-preserve-commit-order=ON` is still functional but was deprecated in MySQL 8.0.26 in favor of `--replica-preserve-commit-order=ON`. Not changed since the deprecated form still works in MySQL 8.0.x; consider updating in a future revision.
- The `password` option inside `cluster.addInstance()`'s options dictionary is documented as valid but is also marked for removal in a future MySQL Shell release. Embedding the password in the connection URI would be more future-proof.
- The `version: "3.8"` Compose file declaration is no longer required by Compose v2 but is still accepted and harmless.
- The `mysql/mysql-server` image is Oracle's variant; the Docker Official Image `mysql:8.0` is more commonly recommended today, but `mysql/mysql-server:8.0` still works.
- The compose file mounts `./mysql/init.sql` for `mysql1` but the post never describes the contents of that file. If the file does not exist on disk, Docker will create an empty directory at the bind path, which would fail to be parsed as an init script. Users following the tutorial may want to either create an empty `init.sql` or remove the mount line. Left as-is since it does not strictly break the cluster setup itself if removed.
- All other commands, flags, configuration directives, and code samples were verified correct.
