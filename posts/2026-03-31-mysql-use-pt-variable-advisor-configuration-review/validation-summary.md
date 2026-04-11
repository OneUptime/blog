# Validation Summary: How to Use pt-variable-advisor for MySQL Configuration Review

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0)
- Percona Toolkit (pt-variable-advisor, pt-mysql-summary)
- systemd (service management)

## Sources Consulted
- Percona Toolkit official documentation for pt-variable-advisor: https://docs.percona.com/percona-toolkit/pt-variable-advisor.html
- Percona Toolkit official documentation for pt-mysql-summary: https://docs.percona.com/percona-toolkit/pt-mysql-summary.html
- Percona Toolkit source code on GitHub: https://github.com/percona/percona-toolkit
- MySQL 8.0 Reference Manual — query cache removal: https://dev.mysql.com/doc/refman/8.0/en/query-cache.html

## Issues Found

1. **Incorrect claim about SHOW GLOBAL STATUS**: The post stated pt-variable-advisor "reads `SHOW VARIABLES` and `SHOW GLOBAL STATUS`." The tool only reads `SHOW VARIABLES`; it does not query `SHOW GLOBAL STATUS`. Removed the incorrect reference.

2. **Fabricated innodb_file_per_table rule in sample output**: The sample output included `# NOTE innodb_file_per_table: innodb_file_per_table is enabled.` However, pt-variable-advisor has no rule for `innodb_file_per_table`. The variable is only mentioned in passing within the description of the `innodb_data_file_path` rule. Removed this line from the sample output.

3. **CRIT severity described as version-dependent**: The post said severities are "`NOTE`, `WARN`, or (in some versions) `CRIT`." CRIT is a standard severity level in all versions of pt-variable-advisor (used by the `debug`, `slave_skip_errors`, and `replica_skip_errors` rules). Removed the "(in some versions)" qualifier.

4. **query_cache settings unsafe for MySQL 8.0.3+**: The my.cnf example included `query_cache_type = 0` and `query_cache_size = 0` with a comment saying "MySQL 8.0 removes it." These variables were completely removed in MySQL 8.0.3+, and including them in my.cnf will prevent the server from starting with an unknown-variable error. Updated the comment to explicitly warn that these lines are MySQL 5.7 only and must be omitted on 8.0.3+.

5. **Removed innodb_file_per_table from my.cnf recommendations**: Since pt-variable-advisor does not flag this variable, including it in the "fixes based on pt-variable-advisor output" section was misleading. Removed the `innodb_file_per_table = ON` entry and its comment from the my.cnf example.

## Review Notes
- The `--password=secret` usage on the command line is standard for tutorials but would produce a security warning from the MySQL client in practice. Not changed since this is a common convention in documentation.
- The pt-mysql-summary syntax using `-- --host=...` is valid (passes options through to the mysql client) but the tool also supports direct `--host`, `--user`, `--password` options. Both forms work; not changed.
- The `SHOW VARIABLES LIKE 'query_cache_type'` verification query will return an empty result on MySQL 8.0.3+ since the variable no longer exists. This is contextually fine given the surrounding discussion.
