# Validation Summary: How to Use MySQL Shell in SQL Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (mysqlsh)
- MySQL (SQL mode)
- MySQL X DevAPI (JavaScript and Python modes)

## Sources Consulted
- MySQL Shell 8.0 Reference Manual — Command Options (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysqlsh.html)
- MySQL Shell 8.0 Reference Manual — SQL Mode (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-commands.html)
- MySQL Shell 8.0 Reference Manual — Result Format (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-output-formats.html)
- MySQL Shell 8.0 Reference Manual — \source command (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-commands.html)
- MySQL Shell 8.0 Reference Manual — Session.runSql() / Session.run_sql() (https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1Session.html)
- MySQL 8.0 Reference Manual — SELECT ... INTO OUTFILE and LOAD DATA INFILE (https://dev.mysql.com/doc/refman/8.0/en/load-data.html)
- MySQL Shell 8.0 Reference Manual — util.importTable() (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-parallel-table.html)

## Issues Found
No technical issues found.

## Review Notes
- The prompt shown (`MySQL  localhost:3306 ssl  SQL >`) reflects a themed/customized prompt rather than the bare default (`mysql-sql>`). This is not incorrect — many installations display this richer prompt via prompt theme files — but readers using a fresh install may see the simpler default prompt instead.
- The `source` command (without backslash) in SQL mode requires MySQL Shell 8.0.19 or later. Earlier versions only support `\source`.
- The `--result-format` flag was introduced in MySQL Shell 8.0.14. The post does not specify a minimum version, which is fine for a general tutorial but worth noting.
- Additional valid result format values exist beyond those shown (`tabbed`, `ndjson`/`json/raw`, `json/array`), but the post does not claim its list is exhaustive.
