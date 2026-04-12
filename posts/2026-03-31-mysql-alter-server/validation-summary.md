# Validation Summary: How to Use ALTER SERVER Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (ALTER SERVER, CREATE SERVER statements)
- FEDERATED storage engine
- mysql.servers system table

## Sources Consulted
- MySQL 8.0 ALTER SERVER Reference Manual: https://dev.mysql.com/doc/refman/8.0/en/alter-server.html
- MySQL 8.4 ALTER SERVER Reference Manual: https://dev.mysql.com/doc/refman/8.4/en/alter-server.html
- MySQL 8.0 CREATE SERVER Reference Manual: https://dev.mysql.com/doc/refman/8.0/en/create-server.html
- MySQL 8.0 Privileges Provided Reference: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found

1. **Incorrect OPTIONS syntax throughout (SET/ADD/DROP keywords)**: The post used `SET option_name 'value'`, `ADD option_name 'value'`, and `DROP option_name` syntax within the OPTIONS clause. MySQL's ALTER SERVER does not use SET, ADD, or DROP keywords — options are specified as simple `option_name 'value'` pairs (e.g., `PASSWORD 'new_pass'` not `SET PASSWORD 'new_pass'`). Fixed all six ALTER SERVER code examples and the syntax description text.

2. **Incorrect privilege claim (SYSTEM_VARIABLES_ADMIN)**: The post stated ALTER SERVER requires "the SUPER privilege (or SYSTEM_VARIABLES_ADMIN in MySQL 8.0+)". SYSTEM_VARIABLES_ADMIN is not a replacement for SUPER for ALTER SERVER. The MySQL documentation only lists SUPER as the required privilege for this statement. Removed the incorrect SYSTEM_VARIABLES_ADMIN reference.

3. **Misleading section title "Adding a Socket Option"**: The use of "Adding" implied ALTER SERVER has a distinct ADD operation. Renamed to "Setting a Socket Option" to accurately reflect that ALTER SERVER simply sets option values.

## Review Notes
- The FEDERATED storage engine (which is the primary use case for ALTER SERVER) is disabled by default in MySQL and must be enabled at server startup with `--federated`. The post does not mention this, but it is not incorrect — it is just outside the scope of the article.
- ALTER SERVER causes an implicit commit and is not written to the binary log, which could be relevant for users relying on replication. The post does not mention this behavior.
- The SUPER privilege is deprecated as of MySQL 8.0.x, but there is no documented dynamic privilege replacement specifically for ALTER SERVER.
