# Validation Summary: How to Use Dapr with Azure Database for PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management component)
- Azure Database for PostgreSQL Flexible Server
- Azure CLI (`az postgres flexible-server`, `az ad sp`)
- Kubernetes (secrets, Dapr component YAML)
- PgBouncer (built-in connection pooling)
- Microsoft Entra ID (Azure AD) authentication

## Sources Consulted
- Dapr PostgreSQL state store v1 documentation — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr PostgreSQL state store v2 documentation — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr State Management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr PostgreSQL state store source code (migrations and schema)
- Azure CLI `az postgres flexible-server ad-admin` reference — https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/ad-admin
- Azure CLI `az postgres flexible-server parameter` reference — https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter
- Azure Database for PostgreSQL Flexible Server connection quickstart — https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/connect-csharp
- Azure PgBouncer documentation — https://learn.microsoft.com/en-us/azure/postgresql/connectivity/concepts-pgbouncer
- Azure CLI Microsoft Graph migration impact — https://learn.microsoft.com/en-us/cli/azure/microsoft-graph-migration

## Issues Found

1. **Username format in connection strings (3 occurrences)**: The post used `user=dapr_user@my-server`, which is the deprecated Single Server format. Azure Database for PostgreSQL Flexible Server uses just the username without the `@server` suffix. Changed to `user=dapr_user` in the kubectl secret and PgBouncer connection string examples.

2. **`az ad sp show --query objectId` should be `--query id`**: Since Azure CLI 2.37.0, the Microsoft Graph migration replaced `objectId` with `id` in command output. Using `objectId` returns null in current CLI versions. Changed to `--query id`.

3. **PgBouncer parameter value**: The command used `--value on` to enable PgBouncer, but the correct value per Azure documentation is `--value true`. Changed accordingly.

4. **State table schema had multiple incorrect column names**: The blog uses Dapr PostgreSQL v1 (`version: v1`), but the pre-create table schema did not match v1's actual schema:
   - Removed `etag TEXT NOT NULL` — v1 uses the PostgreSQL system column `xmin` for ETags, not a user-defined column.
   - Renamed `expiration_time` to `expiredate` (the actual v1 column name).
   - Renamed `update_time` to `updatedate` (the actual v1 column name).
   - Added missing `isbinary BOOLEAN NOT NULL` column (required in v1).
   - Added missing `insertdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()` column.
   - Removed the expiration index (not part of the v1 base schema).

## Review Notes
- The post uses Dapr PostgreSQL state store `version: v1`. Dapr v2 (introduced in Dapr 1.13) is now recommended for new deployments and uses a different table schema (`bytea` values instead of `jsonb`, explicit `etag uuid` column, `expires_at`/`created_at`/`updated_at` naming). A future update could mention v2 as the preferred version.
- The Entra ID section comment says "Assign the PostgreSQL Flexible Server AD Admin role" but the commands actually create an AD administrator on the server (not an Azure RBAC role assignment). The comment is slightly misleading but not technically wrong enough to warrant a change.
- The `az ad sp show` command in the Entra ID section is used to get the object ID of a managed identity's service principal. In practice, for a user-assigned managed identity, `az identity show --query principalId` is often simpler and more direct, but the approach shown works.
