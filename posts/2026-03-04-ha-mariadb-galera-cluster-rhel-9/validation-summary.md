# Validation Summary: How to Set Up a High-Availability MariaDB Galera Cluster on RHEL 9

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
- HAProxy

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers - Replicating MariaDB with Galera: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/assembly_using-mysql_configuring-and-using-database-servers
- MariaDB documentation: Getting Started with MariaDB Galera Cluster: https://mariadb.com/docs/galera-cluster/galera-management/installation-and-deployment/getting-started-with-mariadb-galera-cluster
- MariaDB documentation: Configuring MariaDB Galera Cluster: https://mariadb.com/docs/galera-cluster/galera-management/configuration/configuring-mariadb-galera-cluster
- MariaDB documentation: Galera Cluster System Variables: https://mariadb.com/docs/galera-cluster/reference/galera-cluster-system-variables/
- MariaDB documentation: Galera Cluster Status Variables: https://mariadb.com/docs/galera-cluster/reference/galera-cluster-status-variables
- MariaDB documentation: wsrep_provider_options: https://mariadb.com/docs/galera-cluster/reference/wsrep-variable-details/wsrep_provider_options
- HAProxy documentation: MySQL health checks: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy configuration manual: option mysql-check: https://docs.haproxy.org/3.2/configuration.html

## Issues Found
- The prerequisites said Galera requires at least three nodes for quorum. Three nodes are the recommended production shape for quorum and high availability, but Galera can also use an arbitrator for voting. Updated the wording to avoid overstating the requirement.
- The firewall commands opened TCP port 4567 but omitted UDP port 4567. MariaDB Galera documentation lists port 4567 for replication traffic and notes that multicast replication uses UDP as well as TCP on that port. Added `4567/udp`.
- The HAProxy configuration used `option mysql-check user haproxy` without creating the matching MariaDB user. HAProxy sends a MySQL authentication packet when a user is configured, so the health check user must exist. Added a command to create the `haproxy` user scoped to the HAProxy server IP.
- The HAProxy section installed and configured HAProxy but did not start or enable the service. Added `systemctl enable --now haproxy` so the load balancer actually runs after configuration.
- The conclusion claimed "automatic node recovery" and "no single point of failure" too broadly. Adjusted the wording to "automatic node joining" and clarified that Galera avoids a database-node single point of failure, since the load balancer itself must also be deployed highly available.

## Review Notes
The core MariaDB Galera package names, wsrep options, bootstrap command, join command, status checks, and SST method are consistent with Red Hat and MariaDB documentation. For a production RHEL deployment, Red Hat also documents TLS setup for Galera nodes; this post remains a concise lab-style walkthrough and does not cover the certificate setup in detail.
