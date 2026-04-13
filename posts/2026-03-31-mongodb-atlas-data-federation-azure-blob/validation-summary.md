# Validation Summary: How to Use Atlas Data Federation with Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Data Federation
- Azure Blob Storage
- MongoDB Aggregation Framework (MQL)
- MongoDB Node.js Driver
- Atlas Data Federation admin CLI (mongosh)

## Sources Consulted
- MongoDB Atlas Data Federation Overview: https://www.mongodb.com/docs/atlas/data-federation/adf-overview/overview/
- Azure Blob Storage Configuration for Data Federation: https://www.mongodb.com/docs/atlas/data-federation/config/config-azure-blob/
- Atlas CLI `dataFederation` command reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-datafederation/
- Data Federation admin CLI `createStore` command: https://www.mongodb.com/docs/atlas/data-federation/admin/cli/stores/create-store/
- Atlas Data Federation `$out` stage reference: https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/pipeline/out/
- Data Federation supported file formats (release notes): https://www.mongodb.com/docs/atlas/release-notes/data-federation/

## Issues Found
- **Incorrect CLI command**: The post used `atlas dataFederation stores create` with various flags (`--provider`, `--serviceUrl`, `--containerName`, `--tenantId`, `--clientId`, `--secret`). This command does not exist in the Atlas CLI. The `atlas dataFederation` command group has subcommands like `create`, `update`, `describe`, `list`, and `delete`, but no `stores create` subcommand. Replaced with the correct Data Federation admin CLI approach using `db.runCommand({ createStore: ... })` via mongosh connected to the Federated Database Instance. Added a note that credentials are configured separately through the Atlas UI.

## Review Notes
- The core premise (Atlas Data Federation supporting Azure Blob Storage) is confirmed in official MongoDB documentation.
- ORC file format support is confirmed in the Data Federation changelog.
- The storage configuration JSON structure, aggregation pipeline examples, `$out` to Azure, and cross-provider `$lookup` queries are all consistent with documented Data Federation capabilities.
- The `defaultFormat` field values with leading dots (e.g., `.json`, `.parquet`) are acceptable per MongoDB documentation examples, though some docs show them without the dot.
- The `$out` syntax for Azure (`$out: { azure: { serviceURL, containerName, filename, format } }`) follows the same pattern as the documented S3 syntax (`$out: { s3: { bucket, region, filename, format } }`). The exact Azure field names could not be fully verified against the latest documentation but are consistent with the established pattern.
