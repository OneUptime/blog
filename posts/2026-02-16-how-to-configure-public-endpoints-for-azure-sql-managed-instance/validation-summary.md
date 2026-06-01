# Validation Summary: How to Configure Public Endpoints for Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Managed Instance
- Azure SQL Managed Instance public endpoint
- Azure CLI
- Azure PowerShell
- Azure Network Security Groups
- SQL Server Management Studio and Azure Data Studio connectivity
- C# SQL connection strings
- Python pyodbc connection strings
- Microsoft Entra authentication
- SQL Server Audit
- Microsoft Defender for SQL

## Sources Consulted
- Microsoft Learn: Configure public endpoints in Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/public-endpoint-configure
- Microsoft Learn: Connectivity architecture for Azure SQL Managed Instance - https://learn.microsoft.com/en-au/azure/azure-sql/managed-instance/connectivity-architecture-overview
- Microsoft Learn: Set-AzSqlInstance PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/set-azsqlinstance
- Microsoft Learn: Tutorial: Secure with Microsoft Entra logins - Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/aad-security-configure-tutorial
- Microsoft Learn: Get started with Azure SQL Managed Instance auditing - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/auditing-configure
- Microsoft Learn: CREATE SERVER AUDIT (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-server-audit-transact-sql
- Microsoft Learn: CREATE SERVER AUDIT SPECIFICATION (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-server-audit-specification-transact-sql
- Microsoft Learn: Failover groups overview and best practices - Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/failover-group-sql-mi
- Microsoft Learn: Microsoft Defender for SQL - https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-defender-for-sql

## Issues Found
- The Azure CLI example for finding the public endpoint queried `fullyQualifiedDomainName` as if it returned the public endpoint. Microsoft documents this property as the VNet-local endpoint. Updated the example to derive the public endpoint by inserting `.public.` after the managed instance name and appending port `3342`.
- The authentication section used the older Azure AD name and created a database user with `FROM EXTERNAL PROVIDER` after creating a login. Updated the wording to Microsoft Entra and mapped the database user from the created login with `CREATE USER ... FROM LOGIN`.
- The auditing example omitted the required credential for writing audit files to Azure Blob Storage. Added `CREATE CREDENTIAL` with a shared access signature and included `RETENTION_DAYS` in the `TO URL` audit target.
- The disable-public-endpoint section claimed the change is immediate and drops all existing public endpoint connections. Reworded it to avoid unsupported timing guarantees and to describe the effect after the network configuration update applies.
- The failover-group note said connection strings should be updated to the new primary after failover. Microsoft recommends failover group listeners for normal failover routing, but also documents that failover group listener endpoints cannot be reached through the SQL Managed Instance public endpoint. Updated the note accordingly.
- The brute-force mitigation note suggested Azure Application Gateway or a reverse proxy in front of the public endpoint. Replaced that with tighter NSG source ranges and Microsoft Defender for SQL threat detection, which is the documented Azure SQL control for anomalous access and brute-force detection.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against Microsoft Learn command and product documentation rather than local `az --help` output.
