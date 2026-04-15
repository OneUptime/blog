# Validation Summary: How to Use CockroachDB Multi-Region with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (distributed SQL database, multi-region features)
- Dapr (state store component, PostgreSQL v2)
- Kubernetes (CockroachDB operator, CRD deployment)
- PostgreSQL (wire protocol compatibility)

## Sources Consulted
- CockroachDB official documentation: multi-region SQL syntax (`ALTER DATABASE ... SET PRIMARY REGION`, `ADD REGION`, `SET LOCALITY REGIONAL BY ROW`)
- CockroachDB Kubernetes operator GitHub repo: CRD schema, example manifests (https://github.com/cockroachdb/cockroach-operator)
- CockroachDB survival goals documentation (`SURVIVE ZONE FAILURE`, `SURVIVE REGION FAILURE`)
- CockroachDB `crdb_internal` system tables documentation
- Dapr PostgreSQL v2 state store component reference (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/)
- Dapr CockroachDB state store component reference (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-cockroachdb/)
- Dapr component schema specification (https://docs.dapr.io/reference/resource-specs/component-schema/)

## Issues Found

1. **Missing `SET` keyword in PRIMARY REGION statement**: `ALTER DATABASE dapr_state PRIMARY REGION "us-east1"` was missing the `SET` keyword. Fixed to `ALTER DATABASE dapr_state SET PRIMARY REGION "us-east1"`.

2. **Incorrect Dapr metadata field `tableName`**: The `state.postgresql` v2 component does not have a `tableName` field. Changed to `tablePrefix` with value `"dapr_"` (v2 appends "state" to the prefix, resulting in table name `dapr_state`).

3. **Non-existent Dapr metadata field `schemaName`**: The `state.postgresql` v2 component does not support a `schemaName` field. Removed entirely.

4. **REGIONAL BY ROW ordering and syntax errors**: The blog had `SET LOCALITY REGIONAL BY ROW` before adding the custom `region` column. Without specifying `AS <column>`, CockroachDB auto-creates a `crdb_region` column, making the subsequent `ADD COLUMN region` a separate, unused column. Fixed by reordering: add the custom column first, then use `SET LOCALITY REGIONAL BY ROW AS region`.

5. **Non-existent CockroachDB system table**: `crdb_internal.cluster_replication_status` is not a documented CockroachDB table. Replaced with `SHOW REGIONS FROM DATABASE dapr_state;` which is a real, documented command for checking regional configuration.

6. **`--insecure` flag contradicts TLS-enabled cluster**: The cluster is deployed with `tlsEnabled: true`, but the monitoring command used `--insecure`. Fixed to use `--certs-dir=/certs` instead.

## Review Notes
- The blog uses `state.postgresql` v2 for CockroachDB, which is valid since CockroachDB speaks the PostgreSQL wire protocol and Dapr v2 has improved CockroachDB compatibility. However, Dapr also provides a dedicated `state.cockroachdb` v1 component. The PostgreSQL v2 approach is acceptable and arguably more forward-looking.
- The CockroachDB version `v23.2.0` used in the operator manifest is somewhat dated (current versions are in the v24.x-v25.x range) but is a valid, real release.
- The operator install URLs use the `master` branch. Using a pinned version tag (e.g., `v2.14.0`) would be more reproducible for production use.
