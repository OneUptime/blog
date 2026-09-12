# Validation Summary: Fix Azure SQL TLS Certificate Errors After a SqlClient Upgrade

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure SQL Database
- Microsoft.Data.SqlClient for .NET
- TLS certificate validation
- Tabular Data Stream (TDS) 7.x and 8.0
- Microsoft Entra managed identity authentication
- Azure Private Link and private DNS
- SQL Server dynamic management views

## Sources Consulted
- [Encryption and certificate validation in Microsoft.Data.SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/encryption-and-certificate-validation?view=sql-server-ver17)
- [Microsoft.Data.SqlClient release changes](https://learn.microsoft.com/en-us/sql/connect/ado-net/introduction-microsoft-data-sqlclient-namespace?view=sql-server-ver17)
- [Connect to Azure SQL with Microsoft Entra authentication and SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [TDS 8.0](https://learn.microsoft.com/en-us/sql/relational-databases/security/networking/tds-8?view=sql-server-ver17)
- [SqlConnectionStringBuilder.HostNameInCertificate](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.hostnameincertificate?view=sqlclient-dotnet-core-6.1)
- [Azure Private Link for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)
- [Azure SQL connectivity settings](https://learn.microsoft.com/en-us/azure/azure-sql/database/connectivity-settings?view=azuresql)
- [sys.dm_exec_connections](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-connections-transact-sql?view=sql-server-ver17)

## Issues Found
No technical issues found.

## Review Notes
The version-specific statements were verified: Microsoft.Data.SqlClient 4.0 changed the default of `Encrypt` to `true`; version 5.0 introduced the `Mandatory`, `Optional`, and `Strict` values, with `Strict` using TDS 8.0 and ignoring `TrustServerCertificate`; and version 7.0 moved driver-provided Microsoft Entra authentication support into `Microsoft.Data.SqlClient.Extensions.Azure`. The Azure SQL private endpoint naming guidance, connection string properties, `nslookup` command, and session-scoped DMV query are also consistent with current Microsoft documentation.
