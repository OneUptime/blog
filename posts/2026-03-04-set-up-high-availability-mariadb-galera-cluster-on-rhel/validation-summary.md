# Validation Summary: How to Set Up a High-Availability MariaDB Galera Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB Server
- MariaDB Galera Cluster
- Galera wsrep provider
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers, "Replicating MariaDB with Galera" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- MariaDB Documentation: Configuring MariaDB Galera Cluster - https://mariadb.com/docs/galera-cluster/galera-management/configuring-mariadb-galera-cluster
- MariaDB Documentation: Galera Cluster Address - https://mariadb.com/kb/en/galera-cluster-address/
- MariaDB Documentation: mariadb-secure-installation - https://mariadb.com/kb/en/mariadb-secure-installation/
- MariaDB Documentation: mysql_secure_installation - https://mariadb.com/kb/en/mysql_secure_installation/

## Issues Found
- The post said to run `mysql_secure_installation` on each node. MariaDB documents that `mariadb-secure-installation` is the current command name and warns that the script is not completely safe for Galera once the cluster is running because it directly manipulates privilege tables. I changed the instructions to run `mariadb-secure-installation` on node1 before adding the other nodes.
- The firewall commands opened TCP port 4567 but omitted UDP port 4567. MariaDB documents that the default Galera replication port uses both TCP and UDP. I added `sudo firewall-cmd --permanent --add-port=4567/udp`.
- The introduction and closing health note implied that any node failure leaves the cluster serving traffic without qualification. Galera requires a primary component/quorum for normal operation, so I qualified those statements with "as long as they retain quorum."

## Review Notes
Red Hat's RHEL 9 Galera deployment documentation includes TLS prerequisites for all cluster nodes. The post remains a concise lab-style setup guide, but production deployments should add encrypted Galera communication and broader operational guidance.
