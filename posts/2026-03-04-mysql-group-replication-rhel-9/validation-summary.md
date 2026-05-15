# Validation Summary: How to Set Up MySQL Group Replication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- MySQL 8.0
- MySQL Group Replication
- firewalld
- SQL user and privilege management

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using database servers - MySQL installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_database_servers/assembly_using-mysql_configuring-and-using-database-servers
- MySQL 8.0 Reference Manual - Configuring an Instance for Group Replication: https://dev.mysql.com/doc/refman/8.0/en/group-replication-configuring-instances.html
- MySQL 8.0 Reference Manual - Group Replication Requirements: https://dev.mysql.com/doc/refman/8.0/en/group-replication-requirements.html
- MySQL 8.0 Reference Manual - User Credentials For Distributed Recovery: https://dev.mysql.com/doc/refman/8.0/en/group-replication-user-credentials.html
- MySQL 8.0 Reference Manual - Bootstrapping the Group: https://dev.mysql.com/doc/refman/8.0/en/group-replication-bootstrap.html
- MySQL 8.0 Reference Manual - START GROUP_REPLICATION Statement: https://dev.mysql.com/doc/refman/8.0/en/start-group-replication.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- MySQL Yum Repository Guide, checked for package-name context when using Oracle's upstream repository: https://dev.mysql.com/doc/mysql-yum-repo-quick-guide/en/

## Issues Found
- The post title and description claimed to set up MySQL Group Replication, but the content was a generic database setup guide covering PostgreSQL, MariaDB, and basic MySQL installation. Replaced the unrelated database instructions with MySQL Group Replication setup steps.
- The MySQL installation command used `mysql-community-server`, which is not the RHEL 9 AppStream package name. Changed it to `mysql-server` and kept `mysqld.service`, matching Red Hat's RHEL 9 MySQL documentation.
- The configuration section did not include required Group Replication settings. Added GTID settings, unique `server_id`, disabled unsupported storage engines, Group Replication plugin loading, group UUID, local address, seeds, bootstrap setting, and `report_host`.
- The user creation section created only an application user. Added the distributed recovery user and the privileges documented by MySQL for Group Replication recovery.
- The firewall section opened only the MySQL client service and included PostgreSQL guidance. Removed PostgreSQL guidance and added the Group Replication communication port `33061/tcp`.
- The verification section only ran a client version query. Added a query against `performance_schema.replication_group_members` to confirm member state.

## Review Notes
The post now describes a minimal single-primary MySQL Group Replication setup. It does not cover TLS for distributed recovery, MySQL Router, InnoDB Cluster, or production operational practices such as backups and quorum recovery; those would be useful additions in a longer guide.
