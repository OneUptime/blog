# Validation Summary: How to Implement Change Data Capture (CDC) in Azure Data Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Factory
- Azure SQL Database
- SQL Server Change Data Capture
- ADF Mapping Data Flows
- ADF Lookup, Copy, Execute Data Flow, and Stored Procedure activities
- T-SQL
- Python monitoring with pyodbc

## Sources Consulted
- Microsoft Learn: Change data capture in Azure Data Factory and Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/data-factory/concepts-change-data-capture
- Microsoft Learn: Change Data Capture resource overview: https://learn.microsoft.com/en-us/azure/data-factory/concepts-change-data-capture-resource
- Microsoft Learn: Copy and transform data in Azure SQL Database: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-database
- Microsoft Learn: Change Data Capture with Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/change-data-capture-overview
- Microsoft Learn: Incrementally copy a table using Azure Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/tutorial-incremental-copy-portal
- Microsoft Learn: Alter row transformation in mapping data flow: https://learn.microsoft.com/en-us/azure/data-factory/data-flow-alter-row
- Microsoft Learn: Stored Procedure activity JSON syntax: https://learn.microsoft.com/en-us/azure/data-factory/transform-data-using-stored-procedure

## Issues Found
- Clarified that ADF mapping data flows use Azure SQL native CDC metadata and checkpoints rather than simply reading CDC change tables directly.
- Added the requirement that `@supports_net_changes = 1` requires a primary key or unique index on the source table.
- Corrected the CDC source behavior description to state that ADF loads SQL CDC net changes. The original text implied that ADF exposes both before and after values for updates, but Microsoft documents that ADF native SQL CDC loads net changes through `cdc.fn_cdc_get_net_changes_`.
- Clarified that Alter Row is not required for native CDC sources because ADF detects row markers automatically. Alter Row is appropriate when a custom CDC staging table provides an operation column.
- Replaced deprecated `datetime.utcnow()` usage in the Python monitoring example with `datetime.now(timezone.utc)` and removed an unused import.

## Review Notes
The watermark pattern is technically valid, but it does not capture deletes unless the source implements soft deletes or a separate delete feed. The post already discusses delete handling later, so no additional structural change was made.
