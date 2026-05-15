# Validation Summary: How to Set Up HA MariaDB/PostgreSQL with Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Pacemaker
- Corosync
- pcs
- OCF resource agents
- MariaDB
- PostgreSQL
- Shared storage
- DRBD
- GFS2

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters, Pacemaker resource creation, resource agents, IPaddr2, groups, and manual moves: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_getting-started-with-pacemaker-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 10 documentation: Configuring and managing high availability clusters, current `pcs` resource and property commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Installing and using MariaDB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation: Installing PostgreSQL and `postgresql-setup --initdb`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- MariaDB documentation for `mariadb-install-db` and the legacy `mysql_install_db` name: https://mariadb.com/kb/en/mariadb-install-db/
- ClusterLabs resource-agents `ocf:heartbeat:mysql` man page: https://manpages.ubuntu.com/manpages/questing/man7/ocf_heartbeat_mysql.7.html
- ClusterLabs resource-agents `ocf:heartbeat:pgsql` man page: https://manpages.debian.org/testing/resource-agents/ocf_heartbeat_pgsql.7.en.html

## Issues Found
- The MariaDB example used `mysql_install_db`, which is a legacy name in modern MariaDB. Changed it to `mariadb-install-db --user=mysql --datadir=/var/lib/mysql`, matching current MariaDB documentation while keeping the same initialization intent.
- The MariaDB and PostgreSQL examples said to initialize the database on both nodes. For an active-passive Pacemaker database with a single shared or replicated data directory, initializing both nodes' local data directories is incorrect and can lead to divergent databases. Changed both comments to say the database should be initialized once on the shared data directory.
- The fencing check used `pcs property show stonith-enabled`. Current Red Hat documentation uses `pcs property config` for displaying configured properties. Updated the command to `pcs property config stonith-enabled`.

## Review Notes
The resource agent parameters and operation timeout values for `ocf:heartbeat:mysql`, `ocf:heartbeat:pgsql`, `ocf:heartbeat:IPaddr2`, and `ocf:heartbeat:Filesystem` are consistent with the referenced documentation. The post remains a high-level guide; a production deployment should also validate SELinux labels, database authentication, client reconnection behavior, and the exact shared storage or DRBD resource ordering for the target environment.
