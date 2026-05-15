# Validation Summary: How to Configure HAProxy for MySQL/MariaDB Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- MySQL
- MariaDB
- firewalld
- SELinux
- Bash

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- MySQL 8.4 CREATE USER Statement: https://dev.mysql.com/doc/refman/8.4/en/create-user.html
- MySQL 8.4 SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html
- MariaDB SHOW REPLICA STATUS: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-replica-status
- MariaDB GRANT privileges: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/using_selinux/red_hat_enterprise_linux-9-using_selinux-en-us.pdf

## Issues Found
- The advanced replication health-check script used `SHOW SLAVE STATUS` only, which is deprecated terminology in MySQL 8.4 and misses the current `SHOW REPLICA STATUS` output fields. Updated the script to try `SHOW REPLICA STATUS` first, fall back to `SHOW SLAVE STATUS`, and accept both MySQL `Replica_*` and MariaDB `Slave_*` field names.
- The advanced health-check script was described as being created on each MySQL server, but HAProxy external checks run on the HAProxy host. Updated the instructions so the script is installed on the HAProxy server and checks the backend address/port passed by HAProxy.
- The advanced health-check script was not wired into HAProxy. Added the required `external-check`, `insecure-fork-wanted`, `option external-check`, and `external-check command` configuration.
- The health-check user had only `USAGE`, which is enough for HAProxy's built-in MySQL connectivity check but not for replication-status checks. Added `REPLICATION CLIENT` for MySQL and a commented `REPLICA MONITOR` grant for MariaDB 10.5.9+.
- The write-listener backup comment implied failover behavior without clarifying that HAProxy does not promote replicas. Updated the comment to state that the backup target must already be a promoted standby.

## Review Notes
The main HAProxy TCP-mode configuration, firewalld port commands, MySQL client examples, stats socket commands, and SELinux boolean command are consistent with the consulted documentation. HAProxy was not installed in the local review environment, so the HAProxy configuration could not be validated with a local `haproxy -c` run.
