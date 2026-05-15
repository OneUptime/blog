# Validation Summary: How to Configure MariaDB Galera Cluster for High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- MariaDB Server
- MariaDB Galera Cluster
- Galera wsrep provider
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using database servers, MariaDB Galera Cluster deployment: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Red Hat Enterprise Linux 8: Deploying different types of servers, MariaDB Galera Cluster deployment: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/deploying_different_types_of_servers/deploying-different-types-of-servers.pdf
- MariaDB Documentation, Configuring MariaDB Galera Cluster: https://mariadb.com/docs/galera-cluster/galera-management/configuration/configuring-mariadb-galera-cluster
- MariaDB Documentation, Galera Cluster system variables: https://mariadb.com/docs/galera-cluster/reference/galera-cluster-system-variables/
- MariaDB Documentation, Configuring MariaDB with Option Files: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/configuring-mariadb/configuring-mariadb-with-option-files
- MariaDB Documentation, Understanding Quorum, Monitoring, and Recovery: https://mariadb.com/docs/galera-cluster/high-availability/understanding-quorum-monitoring-and-recovery
- Codership Galera Cluster Documentation, Galera Arbitrator: https://galeracluster.com/documentation/html_docs_20210726-1441-master/documentation/arbitrator.html

## Issues Found
- The firewall example opened TCP port 4567 but not UDP port 4567. MariaDB documentation states that Galera replication traffic on the default 4567 port can use both TCP and UDP, so I added a `firewall-cmd` line for `4567/udp`.
- The closing quorum statement said a Galera Cluster requires a minimum of three nodes. That is too absolute because a two-database-node deployment can use a Galera Arbitrator as a third voting member. I changed the wording to require three voting members and gave the two common examples.

## Review Notes
Red Hat's current RHEL 8 and RHEL 9 Galera deployment documentation includes TLS setup as a prerequisite and shows `wsrep_provider_options` for the node certificates. The post remains technically valid as a basic cluster setup, but a production RHEL guide should add TLS configuration in a future revision.
