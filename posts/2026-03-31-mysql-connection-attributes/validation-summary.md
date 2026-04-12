# Validation Summary: How to Configure MySQL Connection Attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Performance Schema
- MySQL connection attributes protocol
- Python (mysql-connector-python)
- Java (MySQL Connector/J via JDBC)
- Node.js (mysql2)

## Sources Consulted
- MySQL Connector/Python Connection Arguments: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- MySQL Connector/Python 8.0.17 Release Notes: https://dev.mysql.com/doc/relnotes/connector-python/en/news-8-0-17.html
- MySQL Performance Schema Connection Attribute Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-connection-attribute-tables.html
- MySQL Connector/J Connection Properties: https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-connection.html
- node-mysql2 source (lib/connection_config.js, lib/packets/handshake_response.js): https://github.com/sidorares/node-mysql2

## Issues Found

1. **Python parameter name incorrect**: The `mysql.connector.connect()` call used `connection_attrs` as the parameter name. The correct parameter name per the official MySQL Connector/Python documentation is `conn_attrs`. Fixed on line 75.

2. **Node.js (mysql2) approach fundamentally wrong**: The original code used `SET @app_name = 'order-service'` via `conn.query()` after connection. This sets **user-defined session variables**, NOT MySQL connection attributes. Session variables do not appear in `performance_schema.session_connect_attrs`. Replaced the entire Node.js example with the correct `connectAttributes` option in the pool configuration, which sends real connection attributes during the handshake as part of the MySQL protocol.

## Review Notes
- The SQL examples for querying `performance_schema.session_connect_attrs` are correct.
- The Java JDBC example using `connectionAttributes` property with colon-separated key-value pairs is correct for MySQL Connector/J.
- The `performance_schema_session_connect_attrs_size = 0` configuration to disable attribute collection is correct.
- The monitoring view using MAX(CASE WHEN ...) pivot pattern is valid SQL.
- The default attribute names listed (`_client_name`, `_client_version`, `_os`, `_pid`, `_platform`, `_program_name`) are accurate.
