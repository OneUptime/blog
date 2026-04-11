# Validation Summary: How to Use JSON Documents with MySQL X DevAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (X Protocol / X DevAPI)
- Node.js `@mysql/xdevapi` connector
- JSON document storage in InnoDB collections
- MySQL JSON operators (`->`, `->>`)

## Sources Consulted
- MySQL 8.0 Reference Manual — X DevAPI User Guide: Collection Indexing (https://dev.mysql.com/doc/x-devapi-userguide/en/collection-indexing.html)
- MySQL 8.0 Reference Manual — X DevAPI User Guide: Working with Collections (https://dev.mysql.com/doc/x-devapi-userguide/en/devapi-users-working-with-collections.html)
- MySQL Connector/Node.js X DevAPI Reference (https://dev.mysql.com/doc/dev/connector-nodejs/latest/)
- MySQL 8.0 Reference Manual — JSON_TABLE Column Types (https://dev.mysql.com/doc/refman/8.0/en/json-table.html)

## Issues Found
- **Incorrect index type modifier order in `createIndex` call**: The post used `'UNSIGNED INTEGER'` as the type for the `$.userId` index field. MySQL X DevAPI index field types follow the pattern `TYPE [UNSIGNED]`, where the unsigned modifier comes after the base type name. Changed `'UNSIGNED INTEGER'` to `'INT UNSIGNED'` to match the documented format.

## Review Notes
- All other code examples (session setup, document insertion, querying with bind parameters, nested field access, array querying with `IN`, `modify`/`set`/`arrayAppend`, field projection, sorting, and SQL access via `->>`) are correct and use current, non-deprecated APIs.
- The `reuseExistingObject` option in `createCollection` is correctly used to make the setup idempotent.
- Port 33060 is correctly identified as the X Protocol port (distinct from the classic MySQL port 3306).
