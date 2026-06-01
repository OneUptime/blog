# Validation Summary: How to Implement Row-Level Security in Power BI with Azure SQL Database

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Power BI row-level security
- Power BI DirectQuery and Import mode
- DAX security filters
- Azure SQL Database
- SQL Server row-level security
- Transact-SQL security policies and inline table-valued functions
- Microsoft Entra authentication and single sign-on
- Power Query M

## Sources Consulted
- Microsoft Learn: Row-level security (RLS) with Power BI: https://learn.microsoft.com/en-us/power-bi/enterprise/service-admin-rls
- Microsoft Learn: Azure SQL Database with DirectQuery in Power BI: https://learn.microsoft.com/en-us/power-bi/connect-data/service-azure-sql-database-with-direct-connect
- Microsoft Learn: Row-Level Security in SQL Server and Azure SQL Database: https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security
- Microsoft Learn: Power Query M function reference: https://learn.microsoft.com/en-us/powerquery-m/power-query-m-function-reference
- Microsoft Learn: Sql.Database Power Query M function: https://learn.microsoft.com/en-us/powerquery-m/sql-database
- Microsoft Learn: DirectQuery in Power BI: https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about
- Microsoft Learn: Microsoft Entra authentication with Azure SQL: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview

## Issues Found
- The post incorrectly stated that Power BI DirectQuery can set Azure SQL `SESSION_CONTEXT` with a connection string/native-query pattern and used a non-existent Power Query expression, `User.Identity()`. Power Query M does not provide that function, and the documented Power BI pattern for passing a report viewer's identity to Azure SQL Database is DirectQuery single sign-on with Microsoft Entra ID. I replaced that section with SSO setup steps and changed the primary Azure SQL RLS predicate to use `USER_NAME()`.
- The original Azure SQL testing query still set `SESSION_CONTEXT`, which no longer matched the corrected SSO-based predicate. I changed the test to run as a test database user whose name matches `UserRegionMapping.UserEmail`.
- The admin bypass SQL predicate also used `SESSION_CONTEXT`, which was inconsistent with the corrected database-level Power BI approach. I changed it to use `USER_NAME()`.
- The post presented `SESSION_CONTEXT` as the normal Power BI approach. I reframed it as an application-controlled session-context pattern for middle-tier applications or custom embedded scenarios where the application controls the SQL connection.

## Review Notes
- The Power BI DAX RLS sections are broadly consistent with Microsoft guidance for dynamic RLS using `USERPRINCIPALNAME()` and role membership in the Power BI service.
- Power BI documentation now commonly uses "semantic model" rather than "dataset"; the post still uses "dataset" in a few places, but this is terminology drift rather than a technical blocker.
- DirectQuery models with SSO have testing limitations in the Power BI service, so production validation should include testing as actual Viewer-role users.
