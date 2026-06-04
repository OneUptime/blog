# Validation Summary: How to Set Up MySQL Master-Slave Replication in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- MySQL 8.0
- MySQL replication
- Bash

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication setup for replicas, https://dev.mysql.com/doc/refman/8.0/en/replication-setup-replicas.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO, https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: START REPLICA, https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- MySQL 8.0 Reference Manual: SHOW MASTER STATUS, https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.0 Reference Manual: Replication source configuration, https://dev.mysql.com/doc/refman/8.0/en/replication-howto-masterbaseconfig.html
- MySQL Official Docker Image documentation, https://hub.docker.com/_/mysql
- Docker Compose documentation: startup order and health checks, https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose documentation: version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI help for `docker compose up --wait`

## Issues Found
- The replicas did not create the `myapp` database during initialization, while the master created it before replication was configured. Because the guide uses binary log file and position replication from the current master position, the master's initialization-time `CREATE DATABASE` event would not be replayed on the replicas. Added `MYSQL_DATABASE=myapp` to both replica services so later replicated statements against `myapp` have a matching schema baseline.
- The Compose example included the obsolete top-level `version: "3.8"` property. Removed it because the current Compose Specification treats `version` as backward-compatible metadata and Docker Compose can warn that it is obsolete.
- The automation script used a fixed `sleep 15` after starting services. Replaced it with `docker compose up -d --wait`, which waits for services to be running or healthy according to current Docker Compose behavior.

## Review Notes
- The post targets `mysql:8.0`, where `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, and `SHOW REPLICA STATUS` are the current replication statements. `SHOW MASTER STATUS` is still documented for MySQL 8.0, though newer MySQL releases are moving away from master/slave terminology.
- `binlog_format=ROW` remains correct for this setup. MySQL 8.0 defaults to row-based binary logging, and official documentation recommends row-based logging for new replication setups.
