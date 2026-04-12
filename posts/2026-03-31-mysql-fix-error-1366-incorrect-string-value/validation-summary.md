# Validation Summary: How to Fix ERROR 1366 Incorrect String Value in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0)
- MySQL character sets and collations (utf8/utf8mb3 vs utf8mb4)
- Node.js mysql/mysql2 driver
- Python mysql-connector-python driver
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: The utf8mb4 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html
- MySQL 8.0 Reference Manual: The utf8mb3 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb3.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: ALTER DATABASE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-database.html
- MySQL 8.0 Reference Manual: SET NAMES Statement — https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual: Server System Variables (character_set_server, collation_server) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: information_schema.COLUMNS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- mysqljs/mysql npm package documentation — https://github.com/mysqljs/mysql#connection-options
- mysql2 npm package documentation — https://github.com/sidorares/node-mysql2
- mysql-connector-python documentation — https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html

## Issues Found
No technical issues found.

## Review Notes
- The post uses `utf8mb4_unicode_ci` as the collation throughout. In MySQL 8.0, the default collation for `utf8mb4` changed to `utf8mb4_0900_ai_ci`, which is based on Unicode 9.0 and is generally faster. The post's use of `utf8mb4_unicode_ci` is still fully correct and works fine, but readers on MySQL 8.0+ could also use the newer default collation.
- In MySQL 8.0.1+, the server default character set changed from `latin1` to `utf8mb4`. Users on fresh MySQL 8.0+ installations are less likely to encounter this error from server defaults, but will still see it when working with databases or tables migrated from older versions.
- The my.cnf path `/etc/mysql/mysql.conf.d/mysqld.cnf` is Ubuntu/Debian-specific. On RHEL/CentOS the path is typically `/etc/my.cnf` or `/etc/mysql/my.cnf`. This is acceptable for a tutorial but readers on other distributions should adjust accordingly.
