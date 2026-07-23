# Validation Summary: Encrypting SQL Server Connections: Certificates, TLS Errors, and TrustServerCertificate

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server on Windows and Linux
- Transport Layer Security (TLS) and X.509 certificates
- Microsoft.Data.SqlClient
- Microsoft ODBC Driver for SQL Server
- Tabular Data Stream (TDS) 8.0 strict encryption
- SQL Server Configuration Manager and `mssql-conf`
- Transact-SQL dynamic management views
- Always On availability groups
- Transparent Data Encryption (TDE) and backup encryption

## Sources Consulted

- [Certificate requirements for SQL Server](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/certificate-requirements?view=sql-server-ver17)
- [Encrypt connections to SQL Server by importing a certificate](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-sql-server-encryption?view=sql-server-ver17)
- [Encryption and certificate validation in Microsoft.Data.SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/encryption-and-certificate-validation?view=sql-server-ver17)
- [Introduction to Microsoft.Data.SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/introduction-microsoft-data-sqlclient-namespace?view=sql-server-ver17)
- [TDS 8.0](https://learn.microsoft.com/en-us/sql/relational-databases/security/networking/tds-8?view=sql-server-ver17)
- [Protocols for MSSQLSERVER Properties (Flags tab)](https://learn.microsoft.com/en-us/sql/tools/configuration-manager/protocols-for-mssqlserver-properties-flags-tab?view=sql-server-ver17)
- [ODBC DSN and connection string keywords](https://learn.microsoft.com/en-us/sql/connect/odbc/dsn-connection-string-attribute?view=sql-server-ver17)
- [ODBC connection encryption troubleshooting](https://learn.microsoft.com/en-us/sql/connect/odbc/connection-troubleshooting?view=sql-server-ver17)
- [Configuring the JDBC client for encryption](https://learn.microsoft.com/en-us/sql/connect/jdbc/configuring-the-client-for-ssl-encryption?view=sql-server-ver17)
- [`sys.dm_exec_connections` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-connections-transact-sql?view=sql-server-ver17)
- [Encrypt connections to SQL Server on Linux](https://learn.microsoft.com/en-us/sql/linux/security/encrypted-connections?view=sql-server-ver17)
- [Certificate chains](https://learn.microsoft.com/en-us/windows/win32/seccrypto/certificate-chains)
- [Connect to an Always On availability group listener](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/listeners-client-connectivity-application-failover?view=sql-server-ver17)
- [Transparent Data Encryption (TDE)](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17)
- [Backup encryption](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17)

## Issues Found

- The certificate-chain explanation said that both the root and intermediate CA certificates must be trusted on the client. Only the root normally acts as the trust anchor; the client must instead be able to obtain the required intermediate certificates to build the chain. Updated both the connection-decision summary and chain-error guidance to distinguish root trust from intermediate availability.
- The protocol-and-cipher troubleshooting guidance assumed every client uses the operating-system TLS stack. Some drivers use another TLS implementation, such as the Java runtime used by JDBC clients. Updated the wording to refer to the client driver's TLS stack and the server TLS stack and policy.

## Review Notes

- The ADO.NET connection strings are valid for Microsoft.Data.SqlClient. `Encrypt=Strict` requires a TDS 8.0-capable SQL Server and driver, and `TrustServerCertificate` can't bypass certificate validation in strict mode.
- The version claims are current: Microsoft ODBC Driver 18 defaults encryption to enabled, and Microsoft.Data.SqlClient 4.0 changed the `Encrypt` default to `True`.
- Force Strict Encryption is available in SQL Server 2022 (16.x) and later on Windows. Driver and feature support should still be tested because unsupported clients fail when strict encryption is forced.
- The `sys.dm_exec_connections` query is syntactically correct. `encrypt_option = TRUE` establishes that the session is encrypted but does not report whether the client validated the certificate, as the post correctly notes.
