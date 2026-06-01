# Validation Summary: How to Query Parquet and CSV Files in Azure Data Lake

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Synapse Analytics
- Serverless SQL pool
- Azure Data Lake Storage Gen2
- T-SQL OPENROWSET
- Parquet
- CSV
- External data sources, external file formats, external tables, views, and statistics

## Sources Consulted
- Microsoft Learn: Query data storage with serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-data-storage
- Microsoft Learn: OPENROWSET using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Query folders and multiple files using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-folders-multiple-csv-files
- Microsoft Learn: Query CSV files using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-single-csv-file
- Microsoft Learn: Query Parquet files using serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-parquet-files
- Microsoft Learn: Best practices for serverless SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-serverless-sql-pool
- Microsoft Learn: CREATE EXTERNAL FILE FORMAT (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-external-file-format-transact-sql
- Microsoft Learn: CREATE STATISTICS (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-statistics-transact-sql

## Issues Found
- Corrected the CSV schema explanation from "must tell the engine" to "should provide" schema because serverless SQL pool can infer CSV schema, but explicit definitions are recommended for reliable typing.
- Corrected recursive wildcard examples from `**/*.parquet` to the documented `/**` recursive path form.
- Corrected the CSV parser version explanation: parser 2.0 is generally faster for common CSV workloads, but parser 1.0 supports options that parser 2.0 does not.
- Corrected the gzip CSV example to use `PARSER_VERSION = '1.0'`, `FIRSTROW = 2`, and `DATA_COMPRESSION = 'GZIP'` instead of implying automatic gzip detection with parser 2.0.
- Corrected `ESCAPECHAR = '\\'` to `ESCAPECHAR = '\'` because T-SQL does not use backslash string escaping and the option expects a single character.
- Added the required `CREATE EXTERNAL FILE FORMAT` statement before the CETAS Parquet example.
- Corrected the recommended file size range from 100 MB-1 GB to 100 MB-10 GB.
- Corrected the statistics example so it creates statistics on existing columns in an external table instead of on a regular view, and clarified automatic statistics behavior for `OPENROWSET`.

## Review Notes
The post is technically relevant and salvageable. Some example paths and object names are illustrative placeholders and still require matching Azure storage permissions and existing files in a real environment.
