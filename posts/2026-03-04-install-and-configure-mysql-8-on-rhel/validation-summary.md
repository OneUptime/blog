# Validation Summary: How to Install and Configure MySQL 8.0 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- MySQL 8.0 Community Server
- DNF/Yum repositories
- systemd
- firewalld
- MySQL SQL administration
- MySQL server configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Installing MySQL on Linux Using the MySQL Yum Repository: https://dev.mysql.com/doc/refman/8.0/en/linux-installation-yum-repo.html
- MySQL Yum Repository download page: https://dev.mysql.com/downloads/repo/yum/
- MySQL Yum Repository quick guide: https://dev.mysql.com/doc/mysql-yum-repo-quick-guide/en/
- MySQL 8.0 Reference Manual: Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Redo Log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL Security Documentation: Native Pluggable Authentication: https://dev.mysql.com/doc/mysql-security-excerpt/8.0/en/native-pluggable-authentication.html
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/

## Issues Found
- The repository setup command used the old `mysql80-community-release-el9-1.noarch.rpm` package. Updated it to the current EL9 repository setup package shown on the official MySQL Yum Repository download page.
- The post installed the repository package but did not explicitly enable the MySQL 8.0 subrepository. Oracle's current repository package defaults to a newer release series, so I added commands to enable `mysql80-community` and disable the default 8.4 LTS server/tools subrepositories.
- The post suggested disabling the `mariadb` module. Oracle documents the module-masking issue as an EL8-only `mysql` module issue, so I changed this to a commented RHEL 8-only `mysql` module command.
- The configuration used `innodb_log_file_size`, which is deprecated as of MySQL 8.0.30. Replaced it with `innodb_redo_log_capacity`.
- The verification query used `SHOW VARIABLES LIKE 'default_authentication_plugin'`, but that variable is deprecated as of MySQL 8.0.27. Replaced it with a query against `mysql.user` to show account authentication plugins.
- The legacy authentication example did not mention that `mysql_native_password` is deprecated in newer MySQL 8.0 releases. Added that caveat while keeping the compatibility example.
- The closing sentence described MySQL 8.0 as providing the latest MySQL features. Since newer MySQL series exist, changed it to say "MySQL 8.0 features."

## Review Notes
The tutorial remains valid for installing Oracle MySQL 8.0 packages on an EL9-style RHEL system. Future improvements could include a separate note for RHEL-provided `mysql-server` packages versus Oracle's upstream `mysql-community-server`, and stronger production guidance around binding to `0.0.0.0`, host-specific MySQL users, and TLS for remote clients.
