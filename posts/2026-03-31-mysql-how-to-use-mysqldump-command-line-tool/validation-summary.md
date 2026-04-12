# Validation Summary: How to Use mysqldump Command-Line Tool

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL
- mysqldump command-line tool
- Bash scripting (for automated backup example)
- gzip compression

## Sources Consulted
- MySQL 8.4 Reference Manual: mysqldump — A Database Backup Program (https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- MySQL 8.0 Reference Manual: mysqldump options (https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- MySQL 8.0.26 Release Notes — deprecation of master-data in favor of source-data (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html)
- MySQL 8.0.34 Release Notes — deprecation of mysqlpump (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-34.html)
- MySQL Shell 8.4 Reference: dump utilities (https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-dump-instance-schema.html)

## Issues Found

1. **`--add-drop-table` incorrectly presented as opt-in**: The post described `--add-drop-table` as something you need to explicitly add, but this option is enabled by default in mysqldump. Fixed the section to clarify this and changed the example to show `--skip-add-drop-table` instead, which is the more useful non-default option. Also updated the options summary table to note "(on by default)".

2. **`--master-data` is deprecated and removed**: The post used `--master-data=2`, which was deprecated in MySQL 8.0.26 (2021) and removed in MySQL 8.4 (2024). Replaced with `--source-data=2` and added a note about the old option name for users on older MySQL versions.

3. **`mysqlpump` reference is outdated**: The summary recommended `mysqlpump` as an alternative for large databases, but `mysqlpump` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4. Replaced with MySQL Shell's dump utilities (`util.dumpInstance`, `util.dumpSchemas`), which are the current recommended parallel export tools.

## Review Notes
- The backup automation script uses `-p"$MYSQL_PASSWORD"` with the password on the command line. While this works, MySQL will emit a warning about using passwords on the command line being insecure. An alternative is using `mysql_config_editor` to store credentials in `~/.mylogin.cnf` or using a `--defaults-extra-file` option. This is not technically wrong, just worth noting for production use.
- The compressed restore example (`gunzip < file.gz | mysql -u root -p myapp`) uses interactive `-p` with piped input. The `mysql` client reads the password from `/dev/tty` on Unix, so this works, but it could confuse readers. Using `--defaults-extra-file` or a `.my.cnf` file would be cleaner in piped scenarios.
