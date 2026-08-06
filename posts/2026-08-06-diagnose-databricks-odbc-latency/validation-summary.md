# Validation Summary: Diagnose High ODBC Latency in Databricks SQL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Databricks SQL
- Databricks SQL warehouses (serverless, Pro, and classic)
- Databricks ODBC Driver and legacy Simba Spark ODBC Driver
- ODBC connection pooling, OAuth, Arrow serialization, and Cloud Fetch
- Databricks query history system table and Query History UI
- Databricks query profiles, warehouse scaling, queueing, and result caching
- Databricks SQL parameter markers and SQL aggregation functions

## Sources Consulted
- [Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/)
- [Download and install the Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/download)
- [Migrate from Simba Spark ODBC Driver to Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/migration)
- [Authentication settings for the Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/authentication)
- [Driver capability settings for the Databricks ODBC Driver](https://docs.databricks.com/aws/en/integrations/odbc/capability)
- [Databricks ODBC Data Connector Install and Configuration Guide](https://docs.databricks.com/aws/en/assets/files/Databricks-ODBC-Connector-Install-and-Configuration-Guide-43c6853780716c1f60a3cb751b43d2fd.pdf)
- [Query history](https://docs.databricks.com/aws/en/sql/user/queries/query-history)
- [Query history system table reference](https://docs.databricks.com/aws/en/admin/system-tables/query-history)
- [Query profile](https://docs.databricks.com/aws/en/sql/user/queries/query-profile)
- [Query performance insights](https://docs.databricks.com/aws/en/sql/user/queries/performance-insights)
- [Connect to a SQL warehouse](https://docs.databricks.com/aws/en/compute/sql-warehouse/)
- [SQL warehouse types](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-types)
- [SQL warehouse sizing, scaling, and queuing behavior](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-behavior)
- [Example queries for monitoring SQL warehouse activity](https://docs.databricks.com/aws/en/compute/sql-warehouse/monitor/queries)
- [Set up serverless SQL warehouses](https://docs.databricks.com/aws/en/admin/sql/serverless)
- [Query caching](https://docs.databricks.com/aws/en/sql/user/queries/query-caching)
- [Use named parameter markers](https://docs.databricks.com/aws/en/sql/user/queries/query-parameters)
- [`date_trunc` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/date_trunc)

## Issues Found
- The duration explanation referred to the sum of server fields, which could lead readers to double-count `total_duration_ms` and its component fields. It now compares end-to-end client time with `total_duration_ms + result_fetch_duration_ms` and explicitly warns not to add the total to its components.
- The post said the Query History UI could be filtered by client. The documented UI filters do not include client, so that filter was removed; client application and driver analysis remains available through `system.query.history`.
- The connection troubleshooting phase omitted warehouse startup. Databricks documents that establishing a JDBC or ODBC connection to a stopped warehouse can start it automatically, so warehouse state was added to the possible causes of high connection latency before a statement appears.
- The serverless recommendation used region availability as a current AWS caveat. Serverless SQL warehouses are now supported in all AWS regions, so the wording now refers to workspace eligibility instead.
- The queueing example was described as monitoring peak queued queries, but it calculates statement counts and per-statement queue-wait aggregates by start minute and client. The description was corrected to match the query; true peak queued-query concurrency is available through the warehouse monitoring metric.

## Review Notes
The SQL examples use valid current Databricks SQL syntax, including named parameter markers, interval arithmetic, `DATE_TRUNC`, grouping by a select-list alias, and the documented `system.query.history` schema. The query history system table remains in Public Preview. Driver fetch defaults and limits are version-specific; the checked February 2026 driver guide documents `RowsFetchedPerBlock=10000`, `MaxBytesPerFetchRequest=300 MB`, and a 10 MB server cap for `ARROW_BASED_SET` fetches. The post correctly advises checking the guide supplied with the installed driver.
