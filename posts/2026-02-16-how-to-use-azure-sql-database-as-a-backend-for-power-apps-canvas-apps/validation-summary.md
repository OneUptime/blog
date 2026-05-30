# Validation Summary: How to Use Azure SQL Database as a Backend for Power Apps Canvas Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Power Apps Canvas Apps
- Power Fx
- SQL Server connector
- Azure SQL Database
- T-SQL
- Microsoft Entra ID authentication
- Azure SQL Row-Level Security and permissions

## Sources Consulted
- Microsoft Learn: SQL Server connector - https://learn.microsoft.com/en-us/connectors/sql/
- Microsoft Learn: Connect to SQL Server from Power Apps overview - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-overview
- Microsoft Learn: Access data in SQL Server from Power Apps - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-access-data
- Microsoft Learn: View results in SQL Server from Power Apps - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-view-results
- Microsoft Learn: Use Microsoft SQL Server securely with Power Apps - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-server-security
- Microsoft Learn: Overview of connectors for canvas apps - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections-list
- Microsoft Learn: Managed connectors outbound IP addresses - https://learn.microsoft.com/en-us/connectors/common/outbound-ip-addresses
- Microsoft Learn: Azure SQL Database network access controls - https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview
- Microsoft Learn: CREATE USER (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql
- Microsoft Learn: USE (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/language-elements/use-transact-sql
- Microsoft Learn: EditForm, NewForm, SubmitForm, ResetForm, and ViewForm functions - https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-form
- Microsoft Learn: AddColumns, DropColumns, RenameColumns, and ShowColumns functions - https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-table-shaping

## Issues Found
- The Azure SQL user creation script used `CREATE LOGIN` followed by `USE YourDatabase`. In Azure SQL Database, `USE` cannot switch to another database, and Microsoft recommends contained database users for portability. Changed the example to create a contained database user directly in the target database.
- The firewall guidance implied that "Allow Azure services and resources" was equivalent to allowing Power Platform. Clarified that Power Platform managed connector outbound IP ranges or service tags should be allowed, and that "Allow Azure services and resources" is broader.
- The table design guidance said Power Apps expects auto-incrementing IDs. Corrected this to say `IDENTITY` is useful when SQL Server should generate numeric IDs automatically; the connector requires primary keys for updates, not necessarily identity columns.
- The edit form example navigated immediately after `SubmitForm`, which can run before submission succeeds. Changed it so the button calls `SubmitForm(EditForm)` and navigation is placed in the form's `OnSuccess` property.
- The stored procedure example used an `sp_` name and read the result as though the connector returned a bare one-row table. Renamed the procedure to `usp_PlaceOrder`, cast `SCOPE_IDENTITY()` to `INT`, and changed the Power Fx example to use the schema-prefixed procedure name and `.ResultSets.Table1`.
- The delegation section listed `LookUp` and `EndsWith` as non-delegable for SQL Server. Updated the list to reflect current SQL Server delegation support, including `LookUp` and supported `EndsWith(column, value)` usage.
- The `ShowColumns` example used older quoted column-name syntax and implied it fetches only selected columns from SQL Server. Updated it to current Power Fx syntax and clarified that SQL views are preferred when the server must return only selected columns.
- The performance note claimed `Concurrent` roughly cuts load time in half. Changed this to the more accurate statement that it can reduce load time.
- The security section incorrectly stated that every SQL Server connector user uses the same SQL credentials. Updated it to distinguish Microsoft Entra Integrated explicit connections from shared SQL authentication or service principal connections, and clarified that app-side filters are not a security boundary.

## Review Notes
The post is technically relevant and valid after the corrections. Future improvements could include adding a short note that the SQL Server connector is a premium connector and that stored procedures used as gallery data sources should be marked safe only when they have no side effects and return modest result sets.
