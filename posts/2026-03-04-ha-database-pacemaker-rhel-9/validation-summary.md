# Validation Summary: How to Set Up HA MariaDB/PostgreSQL with Pacemaker on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker and pcs
- OCF resource agents
- MariaDB
- PostgreSQL
- Streaming replication
- Shared storage and virtual IP failover

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Using MariaDB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9: Using PostgreSQL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Customer Portal: How to configure PostgreSQL DB in RHEL High Availability Cluster?: https://access.redhat.com/solutions/7002546
- MariaDB Documentation: mariadb-install-db: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-install-db
- Resource Agents man page: ocf_heartbeat_mysql: https://www.mankier.com/7/ocf_heartbeat_mysql
- Resource Agents man page: ocf_heartbeat_pgsql: https://manpages.debian.org/jessie/resource-agents/ocf_heartbeat_pgsql.7.en.html
- PostgreSQL Documentation: libpq connection strings and target_session_attrs: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The MariaDB shared-storage flow did not initialize the data directory before creating and starting the Pacemaker resource. Added a `mariadb-install-db --user=mysql --datadir=/var/lib/mysql` step, which is required to create MariaDB system tables on a newly prepared data directory.
- The MariaDB resource group started the virtual IP before the filesystem and database. Reordered the group to start the filesystem first, then MariaDB, then the VIP, matching Pacemaker group ordering semantics and preventing clients from connecting before the database is available.
- The MariaDB secure-installation command used the legacy MySQL command name. Updated it to `mariadb-secure-installation` for the RHEL 9 MariaDB package naming.
- The PostgreSQL setup started PostgreSQL manually but did not stop it before Pacemaker began managing the service. Added a stop command after replication verification so Pacemaker is the only service manager.
- The PostgreSQL `ocf:heartbeat:pgsql` resource used `rep_mode="sync"` without required replication parameters. Added `master_ip`, `restore_command`, and `restart_on_promote=true` to align the resource definition with the documented RHEL HA PostgreSQL pattern and pgsql resource-agent requirements.
- The PostgreSQL constraints omitted the demote/stop ordering used to keep the VIP tied to the promoted instance lifecycle. Added explicit promote/start and demote/stop ordering constraints with scores.
- The PostgreSQL reconnection text said to use multiple hosts but showed a single VIP. Updated the wording to describe targeting the VIP.
- The conclusion claimed PostgreSQL streaming replication provides zero-data-loss failover. Changed this to a more accurate statement that synchronous streaming replication can minimize data loss when fencing and replication are correctly configured.

## Review Notes
The post remains a high-level guide. A production deployment should still document the full PostgreSQL replication setup, WAL archive directory creation, `postgresql.conf` and `pg_hba.conf` entries, firewall rules, SELinux context handling for shared storage, and site-specific fencing validation.
