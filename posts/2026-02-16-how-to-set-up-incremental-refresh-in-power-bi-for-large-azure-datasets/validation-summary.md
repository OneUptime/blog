# Validation Summary: How to Set Up Incremental Refresh in Power BI for Large Azure Datasets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Power BI Desktop
- Power BI service semantic models
- Power BI incremental refresh
- Power Query M
- Query folding
- Azure SQL Database
- Azure Synapse Analytics
- XMLA endpoint
- SQL Server Management Studio
- Tabular Editor

## Sources Consulted
- Microsoft Learn: Configure incremental refresh for Power BI semantic models - https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-configure
- Microsoft Learn: Configure incremental refresh and real-time data for Power BI semantic models - https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview
- Microsoft Learn: Troubleshoot incremental refresh and real-time data - https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-troubleshoot
- Microsoft Learn: Advanced incremental refresh and real-time data with the XMLA endpoint - https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-xmla
- Microsoft Learn: Query folding guidance in Power BI Desktop - https://learn.microsoft.com/en-us/power-bi/guidance/power-query-folding
- Microsoft Learn: Overview of query evaluation and query folding in Power Query - https://learn.microsoft.com/en-us/power-query/power-query-folding
- Microsoft Learn: Query caching in Power BI Premium or Power BI Embedded - https://learn.microsoft.com/en-us/power-bi/connect-data/power-bi-query-caching

## Issues Found
- The prerequisites incorrectly implied incremental refresh required Premium, Premium Per User, or Pro in a Premium capacity workspace. Updated this to include Power BI Pro and Embedded, while preserving Premium caveats for XMLA endpoint, real-time DirectQuery, and large-model scenarios.
- The query folding prerequisite said native queries from Azure SQL and Synapse support incremental refresh. Microsoft guidance says incremental refresh cannot use hand-written native SQL queries because that prevents the required folding behavior, so the wording now recommends simple table or view queries and avoiding hand-written native SQL for incremental refresh.
- The date filter instructions implied the standard filter UI can directly select `RangeStart` and `RangeEnd`. Updated the workflow to create the filter and then edit the formula bar or Advanced Editor to reference the parameters.
- The query folding troubleshooting advice said to move the range filter as late as possible. Updated it to place the range filter before non-foldable transformations and verify the source query with diagnostics or database tracing when the folding status is unclear.
- The publish step incorrectly said Power BI creates the full partition structure when the PBIX is published. Updated it to explain that the model initially has one partition and the first service refresh applies the policy and creates historical and refresh partitions.
- The monitoring section used an unverified Python `pytabular` sample for inspecting partitions. Replaced it with the Microsoft-documented approach of using XMLA-capable tools such as SSMS or Tabular Editor to inspect partitions.
- The refresh history wording implied the service shows whether a refresh was incremental. Updated it to only claim refresh duration and success/failure, with partition inspection handled through XMLA tooling.
- The query caching recommendation omitted availability limits. Updated it to specify Import models on Power BI Premium or Embedded capacity.

## Review Notes
The post is technically relevant and useful after the corrections. Future improvements could mention that the Detect data changes column should be a separate Date/Time audit column, not the same column used for the `RangeStart`/`RangeEnd` partition filter, and that deleted rows are not detected unless represented as soft deletes.
