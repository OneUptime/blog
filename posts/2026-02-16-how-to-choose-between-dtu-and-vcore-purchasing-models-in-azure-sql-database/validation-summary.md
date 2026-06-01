# Validation Summary: How to Choose Between DTU and vCore Purchasing Models in Azure SQL Database

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure SQL Database
- DTU purchasing model
- vCore purchasing model
- Azure SQL Database service tiers: Basic, Standard, Premium, General Purpose, Business Critical, Hyperscale
- Azure SQL Database serverless compute
- Azure SQL Database read scale-out
- Azure CLI
- Azure Hybrid Benefit

## Sources Consulted
- Microsoft Learn: Compare vCore and DTU-based purchasing models of Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/purchasing-models?view=azuresql
- Microsoft Learn: DTU-based purchasing model overview - https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-dtu?view=azuresql
- Microsoft Learn: Resource limits for single databases using the DTU purchasing model - https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases?view=azuresql
- Microsoft Learn: Resource limits for single databases using the vCore purchasing model - https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-single-databases?view=azuresql
- Microsoft Learn: Serverless compute tier for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql
- Microsoft Learn: Azure SQL Database Hyperscale FAQ - https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-frequently-asked-questions-faq?view=azuresql
- Microsoft Learn: Use read-only replicas to offload read-only query workloads - https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out?view=azuresql
- Microsoft Learn: Migrate Azure SQL Database from the DTU-based model to the vCore-based model - https://learn.microsoft.com/en-us/azure/azure-sql/database/migrate-dtu-to-vcore?view=azuresql
- Azure Retail Prices API - https://prices.azure.com/api/retail/prices

## Issues Found
- The post said vCore lets you choose memory independently. Updated this to explain that memory is determined by the selected hardware configuration and vCore count.
- The post listed Hyperscale storage as up to 100 TB. Updated it to the current documented 128 TB limit.
- The post implied all serverless databases can auto-pause. Updated this to clarify that auto-pause is supported for General Purpose serverless, while Hyperscale serverless supports auto-scaling without auto-pause.
- The post said built-in readable replicas are not available in DTU tiers. Updated this because Premium DTU databases also support read scale-out; Basic, Standard, and General Purpose do not.
- The serverless cost example said auto-paused databases are near $0 without noting storage billing. Updated it to clarify that compute can be near $0 while storage is still billed.
- The final recommendation treated built-in readable replicas as vCore-only. Updated it to direct readers to compare Premium DTU and Business Critical vCore for that requirement.

## Review Notes
The Azure CLI migration example matches Microsoft's documented `az sql db update` pattern. Cost examples are approximate and region-dependent; they were spot-checked against Azure Retail Prices API values for East US and remain reasonable as illustrative examples.
