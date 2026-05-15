# Validation Summary: How to Set Up a High-Availability PostgreSQL Cluster on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- PostgreSQL streaming replication
- Pacemaker and pcs
- OCF resource agents
- Virtual IP failover

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using PostgreSQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing high availability clusters": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_high-availability-and-clusters_considerations-in-adopting-rhel-9
- PostgreSQL documentation, "pg_basebackup": https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation, "Write Ahead Log": https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL documentation, "Replication": https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL documentation, "The pg_hba.conf File": https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- ocf:heartbeat:pgsql resource agent manual page: https://manpages.debian.org/testing/resource-agents/ocf_heartbeat_pgsql.7.en.html
- ClusterLabs pgsql replicated cluster reference: https://projects.clusterlabs.org/w/cluster_administration/pgsql_replicated_cluster/

## Issues Found
- The `pcs resource promotable PostgreSQL` command set clone meta attributes without the explicit `meta` keyword. RHEL 9 documentation notes that configuring clone meta attributes without `meta` is deprecated. Added `meta` before `promoted-max`, `promoted-node-max`, `clone-max`, `clone-node-max`, and `notify`.

## Review Notes
The PostgreSQL installation, initialization, replication configuration, `pg_basebackup -R` usage, `pg_hba.conf` entries, pgsql resource-agent parameters, promotable resource constraints, and VIP resource syntax are consistent with the consulted documentation. In a production deployment, the placeholder network, hostnames, passwords, fencing configuration, and WAL archive/restore path should be adjusted for the actual environment.
