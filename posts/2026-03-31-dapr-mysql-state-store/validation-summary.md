# Validation Summary: How to Configure Dapr with MySQL State Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- MySQL 8.0
- MariaDB
- Docker
- Kubernetes (for secrets)
- Amazon RDS MySQL
- Azure Database for MySQL

## Sources Consulted
- Dapr MySQL state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mysql/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr MySQL component source code: https://github.com/dapr/components-contrib/blob/master/state/mysql/mysql.go

## Issues Found

### 1. Removed unsupported metadata fields `maxConns` and `connMaxLifetime`
**What was wrong:** The component YAML included `maxConns` (value: "20") and `connMaxLifetime` (value: "30m") as metadata fields. These are not valid metadata fields for the Dapr MySQL state store component.
**What was changed:** Removed both fields from the component YAML configuration snippet.
**Why:** The official Dapr MySQL component does not accept these metadata fields. Including them could confuse readers or cause unexpected behavior. The supported metadata fields are: `connectionString`, `schemaName`, `tableName`, `timeoutInSeconds`, `pemPath`, `pemContents`, `cleanupIntervalInSeconds`, and `actorStateStore`.

### 2. Corrected the MySQL table schema
**What was wrong:** The CREATE TABLE statement shown had incorrect column names, types, and was missing columns compared to what Dapr actually creates:
- `value` was shown as nullable `JSON` instead of `JSON NOT NULL`
- `isbinary` was shown as `TINYINT(1)` instead of `BOOLEAN NOT NULL`
- `etag` was shown as `VARCHAR(255)` instead of `eTag VARCHAR(36) NOT NULL`
- `expiredtime DATETIME` should be `expiredate TIMESTAMP NULL`
- `updatetime DATETIME` should be `updateDate TIMESTAMP`
- Missing `insertDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` column
- Missing `row_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` column with unique key
- Index name was `idx_expiredtime` instead of `expiredate_idx`
**What was changed:** Replaced the entire CREATE TABLE statement with the correct schema matching the Dapr source code.
**Why:** Showing the wrong table schema could mislead readers trying to inspect or query their state data directly.

### 3. Fixed column names in SQL inspection queries
**What was wrong:** The "Inspecting State in MySQL" section referenced `updatetime` and `expiredtime` columns, which don't exist in the actual Dapr-created table.
**What was changed:** Changed `updatetime` to `updateDate` and `expiredtime` to `expiredate` in all SQL queries.
**Why:** Using incorrect column names would cause SQL errors when readers try to run the queries.

## Review Notes
- The `schemaName` default value in Dapr is `"dapr_state_store"` and the `tableName` default is `"state"`. The blog uses custom values (`"daprstate"` and `"dapr_state"`) which is valid but readers should be aware of the defaults.
- The connection string in the blog includes the database name in the path (e.g., `/daprstate`). The official docs recommend providing the connection string "without schema" and using the `schemaName` metadata field instead. Both approaches may work, but readers should be aware of this distinction.
- The Docker command, Dapr API endpoints, transaction format, and Kubernetes secret creation commands are all correct.
- The Azure connection string format using `user@server:password` is specific to Azure Database for MySQL and is correctly shown.
