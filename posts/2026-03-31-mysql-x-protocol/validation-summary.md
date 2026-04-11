# Validation Summary: What Is the MySQL X Protocol

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL X Protocol
- MySQL X Plugin (mysqlx)
- MySQL Shell (mysqlsh)
- MySQL Connector/Python (mysqlx module)
- Google Protocol Buffers (protobuf)
- MySQL X DevAPI
- MySQL Document Store

## Sources Consulted
- MySQL 5.7.12 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-12.html
- MySQL 5.7.12 Part 2: Improving the MySQL Protocol — https://dev.mysql.com/blog-archive/mysql-5-7-12-part-2-improving-the-mysql-protocol/
- MySQL Port Reference Tables — https://dev.mysql.com/doc/mysql-port-reference/en/mysql-port-reference-tables.html
- X Protocol Specification — https://dev.mysql.com/doc/dev/mysql-server/latest/page_mysqlx_protocol.html
- X Protocol Comparison to Classic Protocol — https://dev.mysql.com/doc/dev/mysql-server/latest/mysqlx_protocol_comparison.html
- MySQL 8.0: Checking X Plugin Installation — https://dev.mysql.com/doc/refman/8.0/en/x-plugin-checking-installation.html
- MySQL 8.0: Disabling X Plugin — https://dev.mysql.com/doc/refman/8.0/en/x-plugin-disabling.html
- MySQL 8.0: X Plugin Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/x-plugin-options-system-variables.html
- MySQL 8.0: Installing and Uninstalling Plugins — https://dev.mysql.com/doc/refman/8.0/en/plugin-loading.html
- MySQL Shell mysqlsh Reference — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysqlsh.html
- MySQL Connector/Python X DevAPI — https://dev.mysql.com/doc/dev/connector-python/latest/tutorials/getting_started.html

## Issues Found

1. **Incorrect alternative name "MySQL Protocol X"**: The post stated "(also called MySQL Protocol X)" but this is not a recognized name in official MySQL documentation. The standard names are "X Protocol" or "MySQL X Protocol". Removed the parenthetical.

2. **SHOW PLUGINS output showed `mysqlx.so` for Library column**: In MySQL 8.0+, the X Plugin is built into the server, so the Library column is NULL. The original output reflected MySQL 5.7 behavior, but MySQL 5.7 reached end of life in October 2023. Updated the example output to show `NULL` to match MySQL 8.0+.

3. **`UNINSTALL PLUGIN mysqlx;` does not work in MySQL 8.0+**: The X Plugin is a built-in server component in MySQL 8.0 and cannot be uninstalled at runtime. Running `UNINSTALL PLUGIN mysqlx;` returns an error ("Built-in plugins cannot be deleted"). Removed the UNINSTALL PLUGIN command and added a note that the plugin is built-in in 8.0+. The `my.cnf` configuration approach is the correct way to disable it.

4. **Multiplexing claim was overstated**: The post claimed "Multiple logical sessions can be multiplexed over a single connection, enabling connection pooling at the protocol level." The X Protocol supports pipelining and sequential session reuse (resetting a session without reconnecting), but true concurrent multiplexing of independent sessions over a single TCP connection is not an implemented feature. Updated to accurately describe session reuse.

5. **`mysqlx=OFF` changed to `mysqlx=0`**: While `mysqlx=OFF` works in practice, the canonical MySQL documentation for disabling the X Plugin uses `mysqlx=0`. Updated to match official documentation.

## Review Notes
- The `mysqlsh root@localhost:33060 --mysqlx` command is valid but the `--mysqlx` flag is redundant when port 33060 is specified, since MySQL Shell auto-detects the protocol from the port. This is not technically wrong, just slightly redundant.
- The Python connector example uses `mysql-connector-python` package's `mysqlx` module. The API usage is correct and current.
- MySQL 5.7 reached end of life in October 2023. The post correctly states the X Protocol was introduced in 5.7.12, but all example outputs now reflect MySQL 8.0+ behavior since that is the current supported version.
