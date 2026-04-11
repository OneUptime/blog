# Validation Summary: How to Use MySQL as a Document Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / MySQL 5.7.12+
- MySQL Document Store
- X DevAPI (JavaScript mode)
- X Protocol / X Plugin
- MySQL Shell
- InnoDB JSON storage
- SQL JSON path expressions (`->>` operator)
- Functional indexes on JSON columns

## Sources Consulted
- MySQL 8.0 Reference Manual — X DevAPI User Guide: https://dev.mysql.com/doc/x-devapi-userguide/en/
- MySQL 8.0 Reference Manual — Document Store: https://dev.mysql.com/doc/refman/8.0/en/document-store.html
- MySQL 8.0 Reference Manual — Collection CRUD operations: https://dev.mysql.com/doc/x-devapi-userguide/en/crud-ebnf-collection-crud-functions.html
- MySQL 8.0 Reference Manual — MySQL Shell JavaScript mode: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-tutorials-javascript.html
- MySQL 8.0 Reference Manual — Indexing a Collection: https://dev.mysql.com/doc/x-devapi-userguide/en/collection-indexing.html
- MySQL 8.0 Reference Manual — Functional Key Parts (expression-based indexes): https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts

## Issues Found

### 1. Incorrect use of `await` in MySQL Shell JavaScript examples
- **What was wrong:** All JavaScript code examples used the `await` keyword (e.g., `const products = await schema.createCollection('products')`). MySQL Shell JavaScript mode operations are synchronous and do not return Promises. The official MySQL documentation consistently shows these operations without `await`.
- **What was changed:** Removed `await` from all eight occurrences across the `createCollection`, `add`, `find`, `modify`, `remove`, `createIndex`, and `getCollections` examples.
- **Why:** Using `await` at the top level in MySQL Shell may cause syntax errors depending on the Shell version, and is misleading because it implies asynchronous Promise-based operations when the API is synchronous.

### 2. Incorrect `_id` column type
- **What was wrong:** The post stated the `_id` column is "VARCHAR primary key". In MySQL 8.0, the auto-generated `_id` column in Document Store collections is `VARBINARY(32)`, not `VARCHAR`.
- **What was changed:** Changed "VARCHAR primary key" to "VARBINARY(32) primary key".
- **Why:** The underlying table schema uses `VARBINARY(32)` for the `_id` column, as documented in the MySQL 8.0 reference manual.

## Review Notes
- The SQL functional index example (`ALTER TABLE ... ADD INDEX idx_category ((CAST(...)))`) requires MySQL 8.0.13+ for functional key parts. The post doesn't explicitly note this version requirement, but since it recommends MySQL 8.0+ this is acceptable.
- The post correctly notes that X Plugin is enabled by default in MySQL 8.0 and that the default X Protocol port is 33060.
- All X DevAPI method calls (`createCollection`, `add`, `find`, `modify`, `remove`, `createIndex`, `getCollections`, `fetchAll`, `bind`, `fields`) use correct syntax matching the official documentation.
- The SQL JSON path expressions using the `->>` (JSON unquoting extraction) operator are correct.
