# Validation Summary: How to Set Up Azure SQL Database Serverless Tier to Reduce Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Database serverless compute tier
- Azure CLI
- Azure Portal
- SQL connection strings

## Sources Consulted
- Microsoft Learn: Serverless compute tier for Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql
- Microsoft Learn: Single database vCore resource limits - Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-single-databases?view=azuresql
- Microsoft Learn: Azure CLI `az sql db` reference: https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-lts
- Microsoft Learn: Compare vCore and DTU-based purchasing models of Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/purchasing-models?view=azuresql
- Microsoft Learn: vCore purchasing model - Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-sql-database-vcore?view=azuresql

## Issues Found
- The post said serverless was only available in the General Purpose service tier. Updated it to state that serverless is available in General Purpose and Hyperscale, while auto-pause and auto-resume are currently only supported for General Purpose.
- The compute billing explanation only mentioned vCores. Updated it to reflect Microsoft documentation that serverless compute billing is based on the greater of CPU or memory used each second, subject to the configured minimum while the database is online.
- The post said the minimum auto-pause delay is 1 hour. Updated this to the current documented minimum of 15 minutes and kept 60 minutes as the default.
- The auto-pause trigger description implied that idle open connections do not matter. Updated it to state that auto-pause requires zero sessions and zero user-workload CPU throughout the delay period.
- The auto-resume and connection behavior implied the first connection simply waits. Updated it to mention that the first connection attempt can receive a database-unavailable error while the database resumes and that applications should use retry logic.
- The limitations section said Hyperscale was not supported and that long-term backup retention and geo-replication work normally. Updated it to reflect that Hyperscale serverless is supported, but auto-pause is General Purpose-only, and features such as LTR and geo-replication require auto-pause to be disabled.

## Review Notes
The Azure CLI examples use documented `az sql db create` and `az sql db update` options for serverless databases. The local environment did not have the Azure CLI installed, so command verification was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
