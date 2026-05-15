# Validation Summary: How to Configure MariaDB Galera Cluster for High Availability on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB Server
- MariaDB Galera Cluster
- Galera wsrep replication
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers, "Replicating MariaDB with Galera" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- MariaDB documentation: Getting Started with MariaDB Galera Cluster - https://mariadb.com/docs/galera-cluster/galera-management/installation-and-deployment/getting-started-with-mariadb-galera-cluster
- MariaDB documentation: Configuring MariaDB Galera Cluster - https://mariadb.com/docs/galera-cluster/galera-management/configuration/configuring-mariadb-galera-cluster
- MariaDB documentation: Galera Cluster System Variables - https://mariadb.com/docs/galera-cluster/reference/galera-cluster-system-variables

## Issues Found
- The original installation section described PostgreSQL, standalone MariaDB, and MySQL instead of MariaDB Galera Cluster. I replaced it with the RHEL 9 Galera package installation command `dnf install mariadb-server-galera`.
- The configuration section pointed to generic database configuration files and did not configure Galera. I changed it to use `/etc/my.cnf.d/galera.cnf` with `wsrep_on`, `wsrep_cluster_name`, and `wsrep_cluster_address`.
- The original workflow started a standalone database service and never bootstrapped a Galera cluster. I added `galera_new_cluster` for the first node and `systemctl start mariadb.service` for joining nodes.
- The user creation example used only `localhost`, which would not support access from other hosts. I changed it to use `%` for cluster/client network access in the example.
- The firewall section opened PostgreSQL/MySQL service ports only. I replaced it with MariaDB client and Galera replication ports: 3306/tcp, 4567/tcp, 4567/udp, 4568/tcp, and 4444/tcp.
- The verification section only queried database versions. I replaced it with Galera status checks for cluster size, cluster status, local state, and readiness.

## Review Notes
The corrected post is still a concise overview. A production guide should also include TLS certificate setup for Galera traffic, SST method selection, quorum planning, backups, and node recovery procedures.
