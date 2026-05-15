# Validation Summary: How to Compare x86_64 and aarch64 Application Performance on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- x86_64 and aarch64 Linux systems
- DNF package installation
- sysbench CPU, memory, and OLTP benchmarks
- MariaDB
- Linux kernel source builds
- lmbench

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing MariaDB - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/installing-mariadb_using-mariadb
- MariaDB documentation: Unix socket authentication - https://mariadb.com/docs/server/reference/plugins/authentication-plugins/authentication-plugin-unix-socket
- MariaDB documentation: CREATE USER - https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user
- MariaDB documentation: GRANT - https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- sysbench upstream repository and test scripts - https://github.com/akopytov/sysbench
- Fedora Packages: sysbench EPEL 9 package availability - https://packages.fedoraproject.org/pkgs/sysbench/sysbench/
- Red Hat blog: How to install EPEL on RHEL - https://www.redhat.com/en/blog/install-epel-linux
- Linux kernel documentation: Kconfig configuration targets - https://docs.kernel.org/kbuild/kconfig.html
- kernel.org Linux 6.x source index - https://www.kernel.org/pub/linux/kernel/v6.x/

## Issues Found
- The MariaDB/sysbench example used the `root` database account for `mysql` and `sysbench` commands. On RHEL/MariaDB, `root@localhost` commonly authenticates through Unix socket authentication, which is intended for the operating-system root user and can fail when sysbench is run as a normal user. I changed the setup to create a dedicated `sbtest` user with a password, grant it privileges on the `sbtest` database, and pass `--mysql-user`, `--mysql-password`, and `--mysql-db` to sysbench.
- The package installation step assumed `sysbench` was available from enabled RHEL repositories. `sysbench` is available through EPEL for RHEL 9, so I added a note to enable EPEL or use the same trusted internal package source on both systems if needed.

## Review Notes
The benchmark commands and options reviewed are current for sysbench 1.x style tests. The guide remains a high-level methodology; for production-grade comparisons, future improvements could include pinning exact package versions, recording CPU governor settings, checking NUMA topology, using repeated runs, and documenting storage/network hardware details.
