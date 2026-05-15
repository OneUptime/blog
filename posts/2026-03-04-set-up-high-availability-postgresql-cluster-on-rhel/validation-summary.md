# Validation Summary: How to Set Up a High-Availability PostgreSQL Cluster on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- PostgreSQL streaming replication
- Pacemaker
- Corosync
- pcs
- OCF resource agents

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- PostgreSQL documentation: pg_basebackup: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL documentation: Replication settings: https://www.postgresql.org/docs/15/runtime-config-replication.html
- ClusterLabs resource-agents pgsql resource agent: https://github.com/ClusterLabs/resource-agents/blob/main/heartbeat/pgsql

## Issues Found
- PostgreSQL was installed but not initialized before configuration. Added `postgresql-setup --initdb` on the primary node, matching RHEL PostgreSQL setup requirements.
- Cluster traffic could be blocked by `firewalld`. Added the documented `high-availability` service firewall commands.
- The guide configured a replication user but did not create the standby data directory from the primary. Added a `pg_basebackup` step for the standby and stopped/disabled the systemd PostgreSQL service before Pacemaker takes over.
- The Pacemaker `pgsql` resource was configured with `rep_mode="sync"` but lacked the required `restore_command` parameter and replication user setting. Added `restore_command` and `repuser`.
- The resource was later referenced as `pgsql-clone`, but the `pcs resource create` command did not create a promotable clone. Added the `promotable` options required for automatic promotion.
- The role-specific colocation constraint used the older `Master` role syntax. Updated it to the RHEL 9 `promoted` role syntax.
- The verification query did not specify that `pg_stat_replication` should be checked on the primary. Updated the comment to clarify that.

## Review Notes
This remains a simplified two-node HA example. Production RHEL HA clusters require properly configured fencing, and PostgreSQL HA designs should be tested for split-brain handling, replication lag, password handling, and failback procedures before use.
