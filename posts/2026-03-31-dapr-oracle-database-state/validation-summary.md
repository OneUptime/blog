# Validation Summary: How to Use Oracle Database with Dapr State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Oracle Database 19c+
- Oracle Autonomous Database
- Dapr Java SDK
- Kubernetes (secrets, configmaps)
- Oracle Data Guard

## Sources Consulted
- Dapr Oracle Database state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-oracledatabase/
- Dapr components-contrib Oracle state store source: https://github.com/dapr/components-contrib/tree/main/state/oracledatabase
- Dapr Java SDK source (dapr/java-sdk on GitHub) for API verification: DaprClient, DaprClientBuilder, State, StateOptions, TransactionalStateOperation classes
- Oracle Database SQL Language Reference for CREATE USER, CREATE INDEX syntax
- Oracle Database 19c documentation on B-tree index NULL handling

## Issues Found

1. **Table schema did not match Dapr's actual Oracle state table** — The pre-created table had incorrect column names, types, and nullability. Fixed to match Dapr's auto-created schema: `key VARCHAR2(100)`, `value CLOB NOT NULL`, `binary_yn VARCHAR2(1) NOT NULL`, `etag VARCHAR2(50) NOT NULL`, `creation_time`/`expiration_time`/`update_time` as `TIMESTAMP WITH TIME ZONE`.

2. **Partial index WHERE clause is not valid Oracle SQL** — `CREATE INDEX ... WHERE expire_date IS NOT NULL` is PostgreSQL syntax. Oracle does not support partial (filtered) indexes. Removed the WHERE clause; Oracle B-tree indexes inherently exclude all-NULL entries, providing equivalent behavior.

3. **Non-existent `schemaName` metadata field** — The Dapr Oracle state store component does not have a `schemaName` metadata field. Removed from the component configuration.

4. **Non-existent `cleanupInterval` metadata field** — The Dapr Oracle state store component does not have a `cleanupInterval` metadata field. Removed from the component configuration.

5. **`OperationType.upsert` should be `OperationType.UPSERT`** — Java enum constants are uppercase. The `TransactionalStateOperation.OperationType` enum uses `UPSERT` and `DELETE` (uppercase). Fixed to `UPSERT`.

6. **Missing Java imports** — The code was missing imports for `TransactionalStateOperation`, `OperationType`, and `java.util.List`, all of which are used in the transaction example. Added the missing imports.

7. **Summary claimed "partition pruning"** — The post never sets up any partitioning, so this claim was unsupported. Simplified the summary sentence to reference TTL-based expiration only.

## Review Notes
- The `state.oracledatabase` component is currently in **alpha** status in Dapr. The post doesn't mention this, which readers should be aware of for production use.
- The `CONNECT` and `RESOURCE` roles granted in the SQL setup are valid in Oracle 19c+ but are considered legacy. Oracle best practices recommend granting explicit privileges instead. This is acceptable for a tutorial context.
- The connection string format `oracle://user:pass@host:port/service` is correct for Dapr's Oracle driver.
- The Dapr Java SDK API usage (saveState, getState, executeStateTransaction) is correct after the fixes applied.
