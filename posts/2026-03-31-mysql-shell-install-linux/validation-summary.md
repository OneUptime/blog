# Validation Summary: How to Install MySQL Shell (mysqlsh) on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (mysqlsh)
- MySQL APT Repository
- MySQL Yum Repository
- Ubuntu / Debian package management (apt, dpkg)
- RHEL / Rocky Linux / AlmaLinux / Fedora package management (dnf)
- InnoDB Cluster AdminAPI
- MySQL Shell dump/load utilities

## Sources Consulted
- MySQL Shell 8.0 Reference Manual — Starting MySQL Shell: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-install-starting.html
- MySQL Shell 8.4 Reference Manual — Interactive Code Execution: https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-interactive-code-execution.html
- MySQL Shell 8.4.0 Release Notes (default mode change from JS to SQL): https://dev.mysql.com/doc/relnotes/mysql-shell/8.4/en/
- MySQL APT Repository download page: https://dev.mysql.com/downloads/repo/apt/
- MySQL Yum Repository download page: https://dev.mysql.com/downloads/repo/yum/
- MySQL Shell Row class API documentation
- MySQL Shell \option command reference

## Issues Found

1. **Wrong MySQL Shell prompt (`mysql>`)**: The post used `mysql>` as the MySQL Shell prompt in the connection output and tab completion examples. MySQL Shell uses `mysql-sql>`, `mysql-js>`, or `mysql-py>` depending on the active mode. The classic `mysql>` prompt belongs to the legacy `mysql` client, not `mysqlsh`. Fixed both occurrences to `mysql-sql>`.

2. **Incorrect default mode claim**: The post stated SQL mode is "The default mode after connecting." This is only true for MySQL Shell 8.4+, which changed the default from JavaScript to SQL. Updated the text to clarify the version dependency.

3. **Invalid `mysqlsh --option` CLI flag**: The post showed `mysqlsh --option default-mode=sql` to set the default scripting mode. The `--option` flag does not exist as a CLI argument for `mysqlsh`. The correct approach is to use the `\option` command inside the shell. Fixed to `\option --persist defaultMode sql` and corrected the option name from `default-mode` to `defaultMode` (camelCase).

4. **Outdated APT config package version**: Updated `mysql-apt-config_0.8.29-1_all.deb` to `mysql-apt-config_0.8.36-1_all.deb` to reflect the current version available on the MySQL APT repository download page.

5. **Outdated RHEL/Rocky Linux repo package revision**: Updated `mysql84-community-release-el9-1.noarch.rpm` to `mysql84-community-release-el9-3.noarch.rpm` to reflect the current revision.

## Review Notes
- The Fedora repo package (`mysql84-community-release-fc40-1.noarch.rpm`) was not updated as the current revision could not be independently confirmed. It may also be outdated.
- The socket path `/run/mysqld/mysqld.sock` is correct for Debian/Ubuntu installations but differs on other distributions (RHEL uses `/var/lib/mysql/mysql.sock`, upstream default is `/tmp/mysql.sock`). Since the post covers multiple distros, a note about distribution-specific socket paths could be helpful in a future update.
- Package download URLs from `dev.mysql.com/get/` change as new versions are released. Readers should check the MySQL downloads page for the latest package version if the URLs return 404 errors.
- The version output placeholder `MySQL Shell 8.0.x` may confuse readers who install from the `mysql84` repos, which would yield version 8.4.x. A future update could align the version placeholders with the repos being used.
