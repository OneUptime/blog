# Validation Summary: How to Migrate from MySQL 5.7 to MySQL 8

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- MySQL 5.7
- MySQL 8.0
- MySQL 8.4 LTS
- MySQL Shell
- MySQL replication
- mysqldump
- InnoDB
- MySQL option files

## Sources Consulted
- MySQL Product Support EOL Announcements: https://www.mysql.com/support/eol-notice.html
- MySQL 8.0 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/
- MySQL 8.4 Reference Manual, Upgrade Paths: https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html
- MySQL Shell 8.0 Reference Manual, Upgrade Checker Utility: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html
- MySQL 8.0 Reference Manual, Upgrading Binary or Package-based Installations: https://dev.mysql.com/doc/refman/8.0/en/upgrade-binary-package.html
- MySQL 8.0 Reference Manual, Changes in MySQL 8.0: https://dev.mysql.com/doc/refman/8.0/en/upgrading-from-previous-series.html
- MySQL 8.0 Reference Manual, Keywords and Reserved Words: https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL 5.7 Reference Manual, The MySQL Query Cache: https://dev.mysql.com/doc/en/query-cache.html
- MySQL 8.4 Reference Manual, Native Pluggable Authentication: https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html
- MySQL 8.4 Reference Manual, What Is New in MySQL 8.4 since MySQL 8.0: https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html
- MySQL 8.4 Reference Manual, Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server: https://dev.mysql.com/doc/refman/8.4/en/innodb-dedicated-server.html

## Issues Found
- The post implied that upgrading to MySQL 8.0 still provides continued security updates. MySQL 8.0 reached EOL in April 2026, and MySQL 5.7 to 8.4 cannot skip the 8.0 series, so I clarified that 8.0 is the required first hop and MySQL 8.4 LTS is the supported target for continued updates.
- The MySQL Shell command used `checkForServerUpgrade` in command-line form. Official CLI integration uses `check-for-server-upgrade`, so I corrected the command.
- The `ONLY_FULL_GROUP_BY` section said the sample query worked in 5.7 but fails in 8.0. MySQL 5.7 enables `ONLY_FULL_GROUP_BY` by default, so I clarified that the query only worked when that mode was disabled.
- The backup verification command did not actually validate the dump contents because it ran an unrelated `SELECT` while redirecting the dump to stdin. I changed it to verify by restoring the dump to a test server.
- The in-place upgrade steps omitted the required slow shutdown for MySQL 5.7 to 8.0. I added `SET GLOBAL innodb_fast_shutdown=0;` before stopping MySQL.
- The post said MySQL automatically runs `mysql_upgrade`. For MySQL 8.0.16 and later, the server performs upgrade tasks automatically at startup, so I corrected that wording.
- The authentication fallback recommended `mysql_native_password` without version caveats. I limited that advice to MySQL 8.0 and noted that `mysql_native_password` is disabled by default in MySQL 8.4 and `default_authentication_plugin` is removed.
- The post-upgrade `SHOW WARNINGS` check was not a reliable upgrade-error check after `SELECT VERSION()`. I changed the guidance to check the MySQL error log.
- The MySQL option-file snippet used inline comments and a removed MySQL 8.4 variable without caveats. I moved comments to separate lines and added the MySQL 8.4 caveat.
- The data directory backup and rollback examples used `cp -r`, which can fail to preserve important ownership and metadata. I changed them to `cp -a`.
- The collation repair example changed only the table default character set/collation, not existing columns. I changed it to `CONVERT TO CHARACTER SET`.

## Review Notes
The post is technically relevant and salvageable. Future improvements could expand the replication section with GTID and TLS/RSA-key options, and could add a separate MySQL 8.0 to 8.4 follow-up path, but those are broader enhancements rather than correctness fixes for this review.
