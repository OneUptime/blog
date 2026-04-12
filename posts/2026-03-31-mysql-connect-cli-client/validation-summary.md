# Validation Summary: How to Connect to MySQL with the mysql CLI Client

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 (specifically 8.0.36)
- mysql CLI client
- Unix sockets and TCP/IP connections
- MySQL option files (~/.my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysql client: https://dev.mysql.com/doc/refman/8.0/en/mysql.html
- MySQL 8.0 Reference Manual — Connecting to the MySQL Server: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 Reference Manual — Option Files: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL 8.0 Reference Manual — mysql Client Commands: https://dev.mysql.com/doc/refman/8.0/en/mysql-commands.html
- MySQL 8.0 Reference Manual — Using Encrypted Connections (--ssl-mode): https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html

## Issues Found
No technical issues found.

## Review Notes
- All CLI flags (-h, -P, -u, -p, -D, -e, --ssl-mode) are accurate for MySQL 8.0.
- The `[client]` and `[mysql]` section names in ~/.my.cnf are correct for their respective purposes.
- Prompt escape sequences (\\u, \\h, \\d) are correctly double-escaped in the .my.cnf example and single-escaped in the interactive PROMPT example.
- The advice to use `-h 127.0.0.1` to force TCP over Unix socket is correct and a common source of confusion worth highlighting.
- The `--batch` flag correctly produces tab-separated output, making the `.tsv` extension appropriate.
- The security advice about not passing passwords on the command line and using `chmod 600` on option files reflects current best practices.
- The post references MySQL 8.0.36 throughout; all information is current for MySQL 8.0.x and also applies to MySQL 8.4 and 9.x with no breaking changes to these features.
