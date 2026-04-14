# Validation Summary: How to Configure Dapr with Oracle Autonomous Database State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, sidecar injection, Kubernetes annotations)
- Oracle Autonomous Database (ATP - Autonomous Transaction Processing)
- Oracle Cloud Infrastructure (OCI) CLI
- Kubernetes (secrets, volume mounts, deployments)
- Dapr JavaScript/TypeScript SDK (`@dapr/dapr`)
- Oracle Wallet (mTLS authentication)

## Sources Consulted
- Dapr Oracle Database state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-oracledatabase/
- Dapr components-contrib source (oracledatabaseaccess.go metadata struct): https://github.com/dapr/components-contrib/blob/main/state/oracledatabase/oracledatabaseaccess.go
- OCI CLI autonomous-database create reference (v3.74.2): https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/db/autonomous-database/create.html
- Oracle Autonomous Database compute models: https://docs.oracle.com/en-us/iaas/autonomous-database-shared/doc/autonomous-compute-models.html
- Dapr JavaScript SDK source and docs: https://github.com/dapr/js-sdk and https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Removed invalid `metadataTableName` metadata field from Dapr component YAML.** The Dapr Oracle Database state store component only supports three metadata fields: `connectionString`, `oracleWalletLocation`, and `tableName`. There is no `metadataTableName` field in the component struct. The field was removed from the component configuration.

2. **Replaced deprecated `--cpu-core-count 1` with `--compute-model ECPU --compute-count 2` in OCI CLI command.** Oracle has retired the OCPU compute model on Autonomous Database. ECPUs are now the standard billing metric. The `--cpu-core-count` flag is legacy and should be replaced with `--compute-model ECPU` and `--compute-count`. The minimum ECPU count for a standard Autonomous Database Serverless instance is 2, so the value was updated from 1 to 2.

## Review Notes
- The `GRANT CREATE TABLE TO dapr_user` SQL statement is technically redundant since the RESOURCE role already includes CREATE TABLE. This is not incorrect, just unnecessary.
- The `--is-auto-scaling-enabled true` flag in the OCI CLI command is redundant since auto-scaling is enabled by default, but including it explicitly is not wrong and improves clarity.
- The overview states ADB "comes in two flavors" (ADW and ATP), but Oracle has since added additional workload types (AJD, APEX). This is a minor simplification rather than an error.
- The `dapr.io/volume-mounts` annotation correctly mounts the wallet in read-only mode, which is appropriate since the wallet files only need to be read.
- The JavaScript SDK usage (`DaprClient`, `state.save`, `state.get`) is correct and current as of `@dapr/dapr` v3.6.1.
