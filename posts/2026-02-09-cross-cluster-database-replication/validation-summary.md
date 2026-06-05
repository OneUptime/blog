# Validation Summary: How to Set Up Cross-Cluster Database Replication Between Kubernetes Environments

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes StatefulSets, Services, ConfigMaps, Jobs, Deployments, and kubectl
- PostgreSQL 15 streaming replication
- MySQL 8.0 GTID-based replication
- MongoDB 7.0 replica sets
- Python failover automation with psycopg2
- Prometheus Pushgateway-style metric publishing

## Sources Consulted
- PostgreSQL 15 pg_basebackup documentation: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 15 log-shipping standby server documentation: https://www.postgresql.org/docs/15/warm-standby.html
- PostgreSQL recovery configuration documentation: https://www.postgresql.org/docs/current/recovery-config.html
- MySQL 8.0 CHANGE REPLICATION SOURCE TO documentation: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 CHANGE MASTER TO deprecation note: https://dev.mysql.com/doc/refman/8.0/en/change-master-to.html
- MySQL 8.0 START REPLICA documentation: https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- MySQL 8.0 replication user documentation: https://dev.mysql.com/doc/refman/8.0/en/replication-howto-repuser.html
- MongoDB rs.initiate documentation: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB replica set configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- PostgreSQL containers used `command` for server options. In Kubernetes, `command` overrides the image entrypoint, which would bypass the official PostgreSQL initialization flow and prevent `/docker-entrypoint-initdb.d` scripts from running. Changed these to `args`.
- PostgreSQL standby setup appended `standby_mode = 'on'`, which is removed in PostgreSQL 12 and later. Removed the obsolete setting and relied on `pg_basebackup -R`, which creates `standby.signal` and writes recovery connection settings for PostgreSQL 15.
- PostgreSQL `pg_basebackup -R` was invoked with separate `-h` and `-U` flags while also manually appending `primary_conninfo`. Changed it to use a libpq connection string containing host, port, user, and password so the generated `postgresql.auto.conf` contains the needed connection details.
- MySQL primary had no external Service even though the replica referenced a load-balanced primary endpoint. Added a `LoadBalancer` Service for the primary.
- MySQL ConfigMaps were missing `namespace: database`, so the StatefulSets in the `database` namespace would not find them. Added the namespace to the MySQL and monitoring ConfigMaps.
- MySQL replication user creation used a `.sql` init file with a hardcoded password, so it would not match the Kubernetes Secret. Replaced it with a shell init script that uses `MYSQL_REPLICATION_PASSWORD`.
- MySQL replica setup ran replication control statements against the primary from an initContainer. That would configure the wrong server, and initContainers cannot configure the local MySQL server before it starts. Moved the replica setup into the MySQL container startup flow so it configures the local replica after MySQL is reachable.
- MySQL examples used deprecated `STOP SLAVE`, `CHANGE MASTER TO`, and `START SLAVE` statements for MySQL 8.0. Replaced them with `STOP REPLICA`, `CHANGE REPLICATION SOURCE TO`, and `START REPLICA`.
- MongoDB example used an operator pod initContainer to write an `rs.initiate()` script without executing it at the right time. Replaced it with a one-time Job that runs after the MongoDB members are reachable and executes `rs.initiate()` against one member.
- Failover Job referenced `psycopg2` but used a plain `python:3.11` image without installing the dependency. Updated the command to install `psycopg2-binary` before running the script.
- Failover Job mounted a `failover-script` ConfigMap that the post did not show how to create. Added the `kubectl create configmap` command.
- Replication monitoring ConfigMap contained a shell heredoc whose payload was not valid YAML indentation. Replaced it with `printf | curl`, which is valid inside the ConfigMap block scalar and avoids heredoc indentation problems.

## Review Notes
The corrected examples are still illustrative building blocks rather than a complete production design. A production deployment should add TLS/mTLS, NetworkPolicies or firewall rules, replication slots or WAL archiving for PostgreSQL retention, RBAC for the monitoring pod's `kubectl exec`, backup/bootstrap steps for existing MySQL datasets, and a tested failover coordinator that prevents split-brain.
