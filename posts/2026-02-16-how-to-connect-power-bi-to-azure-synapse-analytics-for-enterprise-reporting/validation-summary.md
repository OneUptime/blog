# Validation Summary: How to Connect Power BI to Azure Synapse Analytics for Enterprise Reporting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Power BI Desktop and Power BI Service
- Azure Synapse Analytics dedicated SQL pools
- Azure Synapse Analytics serverless SQL pools
- Power Query connectors
- T-SQL
- DAX
- Microsoft Entra ID authentication
- Power BI data gateways
- Row-level security

## Sources Consulted
- Microsoft Learn: Power Query Azure Synapse Analytics (SQL DW) connector, https://learn.microsoft.com/en-sg/power-query/connectors/azure-sql-data-warehouse
- Microsoft Learn: Import data from a database using native database query, https://learn.microsoft.com/en-us/power-query/native-database-query
- Microsoft Learn: DirectQuery in Power BI, https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about
- Microsoft Learn: Composite model guidance in Power BI Desktop, https://learn.microsoft.com/en-us/power-bi/guidance/composite-model-guidance
- Microsoft Learn: Configure scheduled refresh in Power BI, https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-scheduled-refresh
- Microsoft Learn: On-premises and virtual network data gateways documentation, https://learn.microsoft.com/en-us/data-integration/gateway/
- Microsoft Learn: Use virtual network data gateway and data sources in Power BI, https://learn.microsoft.com/mt-mt/data-integration/vnet/use-data-gateways-sources-power-bi
- Microsoft Learn: How to use OPENROWSET in serverless SQL pool, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Best practices for serverless SQL pool, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-serverless-sql-pool
- Microsoft Learn: Performance tuning with result set caching, https://learn.microsoft.com/mt-mt/azure/synapse-analytics/sql-data-warehouse/performance-tuning-result-set-caching
- Microsoft Learn: sys.dm_pdw_exec_requests, https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-pdw-exec-requests-transact-sql
- Microsoft Learn: Row-Level Security, https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security
- Microsoft Learn: T-SQL features in Synapse SQL pool, https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/overview-features

## Issues Found
- The post said Power BI connects to Azure Synapse in "two main ways" while listing Import, DirectQuery, and Composite. Changed this to "three main storage modes" to match Power BI terminology.
- The connector name was listed as "Azure Synapse Analytics SQL". Updated it to the official Power Query connector name, "Azure Synapse Analytics (SQL DW)".
- The post referred to "Azure AD". Updated this to the current Microsoft Entra ID naming.
- The DirectQuery comparison table said data volume is "Unlimited". Changed this to note that DirectQuery is constrained by source performance and DirectQuery limits.
- The serverless SQL pool section did not mention Microsoft guidance that complex or large Power BI workloads should generally use Import mode rather than interactive DirectQuery. Added a short caveat.
- The private endpoint section said an on-premises data gateway is required. Updated it to include the VNet data gateway option for Azure private-network data sources.
- The Synapse RLS section did not distinguish dedicated SQL pool support from serverless SQL pool limitations and did not mention that per-viewer database RLS requires viewer identity passthrough. Clarified that the example is for dedicated SQL pool DirectQuery with Microsoft Entra SSO or another per-viewer connection identity.
- The RLS predicate used `SESSION_USER` for email mapping. Updated the example to `USER_NAME()`, which aligns with Microsoft RLS examples and the database user identity used by the predicate.

## Review Notes
The remaining SQL and DAX snippets are illustrative and depend on the reader's schema, permissions, and storage access configuration. The serverless `OPENROWSET` example is syntactically valid, but private storage access may require credentials, external data sources, or Microsoft Entra passthrough permissions in a real environment.
