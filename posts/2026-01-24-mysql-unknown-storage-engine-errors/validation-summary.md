# Validation Summary: How to Fix 'Unknown Storage Engine' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MySQL storage engines
- InnoDB
- MyISAM, MEMORY, ARCHIVE, BLACKHOLE, FEDERATED, MERGE/MRG_MYISAM
- MySQL plugins
- MySQL backup and upgrade utilities
- MySQL configuration files

## Sources Consulted
- MySQL 8.0 Reference Manual: Alternative Storage Engines - https://dev.mysql.com/doc/refman/8.0/en/storage-engines.html
- MySQL 8.4 Reference Manual: Forcing InnoDB Recovery - https://dev.mysql.com/doc/refman/8.4/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual: Server Command Options - https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- MySQL 8.4 Reference Manual: Installing and Uninstalling Plugins - https://dev.mysql.com/doc/refman/8.4/en/plugin-loading.html
- MySQL 8.4 Reference Manual: Pluggable Storage Engine Architecture - https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage.html
- MySQL 8.4 Reference Manual: FEDERATED Storage Engine - https://dev.mysql.com/doc/refman/8.4/en/federated-storage-engine.html
- MySQL 8.4 Reference Manual: ARCHIVE Storage Engine - https://dev.mysql.com/doc/refman/8.4/en/archive-storage-engine.html
- MySQL 8.4 Reference Manual: BLACKHOLE Storage Engine - https://dev.mysql.com/doc/refman/8.4/en/blackhole-storage-engine.html
- MySQL 8.0 Reference Manual: Preparing Your Installation for Upgrade - https://dev.mysql.com/doc/refman/8.0/en/upgrade-prerequisites.html
- MySQL Shell Reference Manual: Upgrade Checker Utility - https://dev.mysql.com/doc/mysql-shell/9.7/en/mysql-shell-utilities-upgrade.html
- MySQL Developer Zone: MySQL 8.0.16 mysql_upgrade is going away - https://dev.mysql.com/blog-archive/mysql-8-0-16-mysql_upgrade-is-going-away/

## Issues Found
- Replaced the obsolete `SHOW VARIABLES LIKE 'have_innodb'` check with `SHOW ENGINES`, because current MySQL documentation recommends `SHOW ENGINES` for checking storage-engine support and `have_innodb` is not the correct current diagnostic.
- Removed `innodb = OFF` from the disabled-InnoDB configuration examples and added a caveat that `skip-innodb` is deprecated and ineffective in MySQL 8.0+, matching the current server option documentation.
- Corrected FEDERATED enablement by using the documented `[mysqld] federated` startup option and removing the unsupported dynamic `INSTALL PLUGIN FEDERATED SONAME 'ha_federated.so'` example.
- Corrected ARCHIVE and BLACKHOLE guidance by replacing runtime plugin-install examples with availability checks and source-build flags, matching current MySQL documentation for those engines.
- Changed the table-engine inspection note from referring to `.frm` files to using `SHOW CREATE TABLE`, avoiding an inaccurate implication that the command reads `.frm` files directly.
- Corrected the MySQL 5.7 to 8.0 upgrade commands: `mysqlcheck --check-upgrade` is a shell command with authentication options, and `mysql_upgrade` is deprecated from MySQL 8.0.16 because server startup performs the upgrade tasks. Added the documented MySQL Shell upgrade checker.
- Corrected the MySQL 8.0 engine-status table for PARTITION and MERGE/MRG_MYISAM terminology.

## Review Notes
The post remains a practical troubleshooting guide. Some examples are environment-dependent, especially package paths, service names, and plugin availability, but the corrected commands and claims now align with official MySQL documentation.
