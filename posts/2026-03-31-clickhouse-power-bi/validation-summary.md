# Validation Summary: How to Use ClickHouse with Power BI

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (ODBC driver, SQL DDL, SummingMergeTree engine, settings profiles, query cache)
- Power BI Desktop (ODBC connector, Import mode, DirectQuery mode)
- Power Query M (Odbc.DataSource, table transformations, type conversions)
- DAX (SUM, DIVIDE, CALCULATE, VAR/RETURN, FILTER/ALL running total pattern)
- Power BI Service (publishing, on-premises data gateway, scheduled refresh)
- Windows ODBC Data Source Administrator

## Sources Consulted
- ClickHouse ODBC driver GitHub repository: https://github.com/ClickHouse/clickhouse-odbc
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on CREATE USER and access control: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse documentation on CREATE SETTINGS PROFILE: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse documentation on query cache: https://clickhouse.com/docs/en/operations/query-cache
- Microsoft Power BI documentation on ODBC connectors: https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-connect-using-generic-interfaces
- Microsoft Power Query M reference: https://learn.microsoft.com/en-us/powerquery-m/
- Microsoft DAX reference: https://learn.microsoft.com/en-us/dax/
- Microsoft Power BI on-premises data gateway documentation: https://learn.microsoft.com/en-us/power-bi/connect-data/service-gateway-onprem

## Issues Found
No technical issues found.

## Review Notes
- The post uses `IDENTIFIED WITH plaintext_password BY` for user creation. While this is valid ClickHouse syntax, production deployments should prefer `sha256_password` or `bcrypt_password` for better security, as `plaintext_password` stores the credential without hashing.
- ClickHouse now offers an official Power BI connector (available since 2023) that provides a native connection without requiring ODBC driver setup. The ODBC approach shown here remains valid and widely used, but readers may want to evaluate the native connector as an alternative.
- The scheduled refresh limit of "up to 8 per day" applies to Power BI Pro licenses. Power BI Premium supports up to 48 refreshes per day, which may be worth noting for enterprise readers.
- The YoY DAX measure uses a boolean predicate filter in CALCULATE (`YEAR(column) = value`), which internally removes all existing date filters and replaces them with the year filter. This is correct behavior for this use case but is a subtle DAX concept worth understanding.
