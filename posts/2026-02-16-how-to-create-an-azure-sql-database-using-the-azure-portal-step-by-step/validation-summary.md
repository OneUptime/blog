# Validation Summary: How to Create an Azure SQL Database Using the Azure Portal Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Azure Portal
- Azure SQL logical server
- SQL authentication
- Microsoft Entra authentication
- Azure SQL networking and firewall rules
- Microsoft Defender for SQL
- Transparent Data Encryption
- Azure SQL Query editor
- SQL Server Management Studio
- Visual Studio Code MSSQL extension

## Sources Consulted
- Microsoft Learn: Quickstart: Create a single database - Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/single-database-create-quickstart
- Microsoft Learn: Azure SQL Database and Azure Synapse Analytics network access controls - https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview
- Microsoft Learn: What is a logical server in Azure SQL Database and Azure Synapse? - https://learn.microsoft.com/en-us/azure/sql-database/sql-database-logical-servers
- Microsoft Learn: Azure portal query editor for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/query-editor
- Microsoft Learn: Serverless compute tier for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview
- Microsoft Learn: Long-term retention backups - Azure SQL Database and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview
- Microsoft Learn: What's happening with Azure Data Studio - https://learn.microsoft.com/en-us/azure-data-studio/whats-happening-azure-data-studio
- Microsoft Azure: Create your Azure free account - https://azure.microsoft.com/en-us/pricing/offers/azure-credit-offers/

## Issues Found
- The post referred to "Azure Active Directory authentication." Microsoft documentation now uses "Microsoft Entra authentication," so the wording was updated to match the current product name.
- The networking section said a public endpoint gives the database a public IP address. Microsoft documents the public endpoint as the logical server endpoint in the format `yourservername.database.windows.net`, with access controlled by firewall rules. The wording was corrected.
- The post recommended Azure Data Studio as a cross-platform alternative to SSMS. Azure Data Studio retired on February 28, 2026 and no longer receives updates or security fixes, so this section was updated to recommend Visual Studio Code with the MSSQL extension.

## Review Notes
The remaining portal flow, sample T-SQL query, Query editor usage, firewall guidance, automatic backup note, TDE note, and serverless cost guidance are consistent with current Microsoft documentation. The Azure Portal UI changes over time, so screenshots or exact button labels should be rechecked before future publication updates.
