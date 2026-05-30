# Validation Summary: How to Set Up Transactional Replication with Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server transactional replication
- Azure SQL Database subscribers
- Azure Files
- Azure CLI
- Transact-SQL replication stored procedures

## Sources Consulted
- Microsoft Learn: Transactional replication with Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/replication-transactional-overview?view=azuresql
- Microsoft Learn: Tutorial: Configure replication between two SQL managed instances - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/replication-between-two-instances-configure-tutorial?view=azuresql
- Microsoft Learn: Tutorial: Configure transactional replication between Azure SQL Managed Instance and SQL Server - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/replication-two-instances-and-sql-server-configure-tutorial?view=azuresql
- Microsoft Learn: sp_adddistpublisher (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-adddistpublisher-transact-sql?view=sql-server-ver17
- Microsoft Learn: sp_adddistributiondb (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-adddistributiondb-transact-sql?view=sql-server-ver17
- Microsoft Learn: sp_addpublication (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-addpublication-transact-sql?view=sql-server-ver17
- Microsoft Learn: Publish Data and Database Objects - https://learn.microsoft.com/en-us/sql/relational-databases/replication/publish/publish-data-and-database-objects?view=sql-server-ver17
- Microsoft Learn: az storage account - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Microsoft Learn: az storage share - https://learn.microsoft.com/en-us/cli/azure/storage/share?view=azure-cli-latest

## Issues Found
- The Mermaid diagram labeled the distributor-to-subscriber path as the Log Reader Agent. Changed it to Distribution Agent because the Log Reader Agent reads the publisher transaction log and writes to the distributor, while the Distribution Agent delivers changes to subscribers.
- The distributor and publisher examples used hard-coded fully qualified names where Microsoft examples use `@@SERVERNAME` for local Managed Instance publisher/distributor setup. Updated the examples to use `@@SERVERNAME`.
- The publisher registration omitted `@storage_connection_string` and instead instructed readers to create a SQL credential for the Azure file share. Updated the setup to retrieve the storage account connection string and pass it to `sp_adddistpublisher`, matching Microsoft guidance for Azure SQL Managed Instance replication snapshot storage.
- The publication setup did not configure the Log Reader Agent credentials. Added `sp_changelogreader_agent` with SQL authentication, matching the Managed Instance tutorial pattern.
- The troubleshooting note for snapshot failures referred to a credential that is no longer the correct setup in this post. Updated it to refer to `@storage_connection_string`.
- The network troubleshooting note listed SQL Managed Instance ports `1433, 11000-11999` but omitted Azure Files port 445. Updated it to call out outbound TCP 1433 for SQL connectivity and outbound TCP 445 for Azure file share access, matching the Managed Instance replication requirements.

## Review Notes
The Azure CLI binary was not installed in the local environment, so CLI syntax was checked against Microsoft Learn rather than local `az --help` output.
