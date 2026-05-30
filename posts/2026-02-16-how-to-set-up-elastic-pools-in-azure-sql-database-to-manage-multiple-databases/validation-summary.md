# Validation Summary: How to Set Up Elastic Pools in Azure SQL Database to Manage Multiple Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Database elastic pools
- Azure CLI
- Azure PowerShell Az.Sql module
- DTU and vCore purchasing models

## Sources Consulted
- Microsoft Learn: Elastic pools help you manage and scale multiple databases in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview?view=azuresql
- Microsoft Learn: Manage elastic pools in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-manage
- Microsoft Learn: Resource limits for elastic pools using the DTU purchasing model - https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-elastic-pools?view=azuresql
- Microsoft Learn: Resource limits for elastic pools using the vCore purchasing model - https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-elastic-pools?view=azuresql
- Microsoft Learn: Azure CLI az sql elastic-pool reference - https://learn.microsoft.com/en-us/cli/azure/sql/elastic-pool?view=azure-cli-latest
- Microsoft Learn: Azure CLI az sql db reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-lts
- Microsoft Learn: Scale an elastic pool in Azure SQL Database using the Azure CLI - https://learn.microsoft.com/en-us/azure/azure-sql/database/scripts/scale-pool-cli?view=azuresql
- Microsoft Learn: New-AzSqlElasticPool Az.Sql reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/new-azsqlelasticpool?view=azps-15.3.0
- Microsoft Learn: Get started with cross-database queries in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-getting-started-vertical?view=azuresql

## Issues Found
- Updated the cost-effectiveness rule of thumb. The post cited a specific "two S3 or fifteen S0" recommendation as current Microsoft documentation. Current Microsoft guidance says savings can be possible with as few as two S3 databases and recommends comparing pool price against required single-database compute sizes, so the wording was changed to match current guidance.
- Clarified per-database maximum resource settings. The original wording said the maximum should be less than the pool total to ensure one database cannot starve others. Microsoft documents max per-database settings as a way to prevent one database from monopolizing resources, but Azure SQL Database also has resource governance and fairness behavior. The wording was softened to avoid an over-absolute guarantee.
- Clarified moving databases in and out of a pool. Microsoft states there is no downtime except for a brief period, on the order of seconds, when connections are dropped at the end of the operation. The post now includes that caveat.
- Made the CLI example for moving a database out of the pool more explicit by adding `--edition Standard` alongside `--service-objective S0`, matching Azure CLI documentation patterns for updating a database to a standalone Standard service objective.
- Corrected the limitation about cross-database queries. Azure SQL Database does support cross-database queries through elastic query, documented as a preview feature, so the limitation was rewritten to distinguish elastic query from full SQL Managed Instance-style cross-database querying.

## Review Notes
The Azure CLI and PowerShell examples use current command names and parameters. Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft Learn CLI reference documentation rather than local `az --help` output.
