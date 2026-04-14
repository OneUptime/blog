# Validation Summary: How to Configure Dapr with Microsoft SQL Server State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- Microsoft SQL Server (2022-latest Docker image)
- Azure SQL Database
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes (secrets, component manifests)
- Docker

## Sources Consulted
- Dapr SQL Server State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlserver/
- Dapr Component schema specification: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr state management how-to guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Microsoft SQL Server Docker image reference: https://hub.docker.com/_/microsoft-mssql-server

## Issues Found

1. **Incorrect metadata field name `cleanupInterval`**: The blog used `cleanupInterval` with a duration value of `"1h"`. The correct Dapr metadata field name is `cleanupIntervalInSeconds` and it accepts a numeric string value in seconds. Changed to `cleanupIntervalInSeconds` with value `"3600"`.

2. **Incorrect SQL column names in direct query example**: The query referenced `[UpdateTime]` and `[ETag]` columns, which do not exist in the Dapr SQL Server state table. The actual column names are `[UpdateDate]` (datetime of last update) and `[RowVersion]` (used for optimistic concurrency / ETag). Updated the SELECT list and ORDER BY clause accordingly.

## Review Notes
- The Docker command, SQL setup scripts, Kubernetes secret creation, component YAML structure, and JavaScript SDK usage are all correct.
- The component type `state.sqlserver`, apiVersion `dapr.io/v1alpha1`, and version `v1` are all correct per current Dapr documentation.
- The `keyType`, `indexedProperties`, `schema`, and `tableName` metadata fields are all valid for this component.
- The Azure SQL Database connection string format with `user@server` syntax is correct for SQL authentication against Azure SQL.
- The SQL permissions granted to the Dapr user (CREATE TABLE, ALTER ON SCHEMA, SELECT/INSERT/UPDATE/DELETE) are appropriate since Dapr auto-creates and manages its state table.
