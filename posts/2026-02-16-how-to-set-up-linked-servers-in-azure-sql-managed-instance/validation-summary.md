# Validation Summary: How to Set Up Linked Servers in Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server linked servers
- Transact-SQL stored procedures (`sp_addlinkedserver`, `sp_addlinkedsrvlogin`, `sp_serveroption`, `sp_testlinkedserver`)
- Microsoft OLE DB Driver for SQL Server (`MSOLEDBSQL`)
- Azure SQL Database
- Distributed transactions / DTC
- Azure networking, VPN, ExpressRoute, and NSG connectivity

## Sources Consulted
- Microsoft Learn: Linked servers (Database Engine): https://learn.microsoft.com/en-us/sql/relational-databases/linked-servers/linked-servers-database-engine
- Microsoft Learn: sp_addlinkedserver (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-addlinkedserver-transact-sql
- Microsoft Learn: sp_serveroption (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-serveroption-transact-sql
- Microsoft Learn: OPENQUERY (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/functions/openquery-transact-sql
- Microsoft Learn: Distributed Transaction Coordinator (DTC) for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/distributed-transaction-coordinator-dtc
- Microsoft Learn: Connectivity architecture for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connectivity-architecture-overview

## Issues Found
- The post used the deprecated SQL Server Native Client provider (`SQLNCLI`) in linked server examples. Updated examples to use the recommended Microsoft OLE DB Driver for SQL Server (`MSOLEDBSQL`) and added provider-string encryption settings.
- The post implied Azure SQL Managed Instance linked servers can target other ODBC or non-SQL sources. Microsoft documentation currently states that Azure SQL Managed Instance supports only SQL Server, Azure SQL Database, and other SQL managed instances as remote data sources for linked servers, so the non-SQL source references were removed or corrected.
- The Azure SQL Database TLS note said the default SQLNCLI provider handles encryption. Updated it to reference `MSOLEDBSQL` and explicit encryption.
- The limitations section incorrectly framed non-SQL linked servers as limited only by provider availability. Replaced this with the current Managed Instance remote data source limitation and added the DTC caveat for Azure SQL Database.

## Review Notes
The remaining examples are illustrative and depend on environment-specific networking, DNS, certificates, firewall/NSG rules, login mappings, and remote database objects. For on-premises SQL Server targets, `encrypt=optional` may need to be changed to `encrypt=mandatory` or paired with certificate configuration depending on the organization's security requirements and SQL Server/provider versions.
