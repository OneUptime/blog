# Validation Summary: How to Deploy Azure Cosmos DB with Multi-Region Writes Using Pulumi in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi Azure Native provider
- Go
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB multi-region writes
- Azure Cosmos DB consistency levels
- Azure Cosmos DB conflict resolution
- Azure Cosmos DB autoscale throughput
- Azure Cosmos DB zone redundancy

## Sources Consulted
- Pulumi Azure Native v2 DatabaseAccount documentation: https://www.pulumi.com/registry/packages/azure-native@2.x/api-docs/documentdb/databaseaccount/
- Pulumi Azure Native v2 SqlResourceSqlContainer documentation: https://www.pulumi.com/registry/packages/azure-native@2.x/api-docs/documentdb/sqlresourcesqlcontainer/
- Azure Cosmos DB multi-region writes documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/multi-region-writes
- Azure Cosmos DB multi-region application configuration documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-multi-master
- Azure Cosmos DB conflict resolution documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-conflicts
- Azure Cosmos DB consistency levels documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Azure Cosmos DB autoscale throughput documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale
- Azure Cosmos DB zone redundancy documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/enable-zone-redundancy
- Azure Cosmos DB continuous backup documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/continuous-backup-restore-introduction

## Issues Found
- The consistency-level explanation said stronger consistency levels like Strong or Bounded Staleness are available with multi-region writes. Azure Cosmos DB accounts with multiple write regions cannot use Strong consistency, so the text was changed to say Bounded Staleness is available and Strong consistency is not supported for accounts with multiple write regions.

## Review Notes
- The Pulumi Go examples use Azure Native v2 `documentdb` resources and match the documented resource names and property shapes.
- The environment did not have `go` or `pulumi` installed, so local compilation and `pulumi preview` could not be run. Syntax and API checks were performed against official Pulumi registry documentation instead.
- Azure documentation for continuous backup has some older provisioning-page wording about single write regions, but current Azure Cosmos DB continuous-backup documentation and Azure Cosmos DB product blog material describe multi-region write account support.
