# Validation Summary: How to Use ClickHouse with Census for Reverse ETL

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (data warehouse / source)
- Census (reverse ETL platform)
- Salesforce (CRM destination)
- Facebook Custom Audiences (ad platform destination)
- SQL (ClickHouse dialect)

## Sources Consulted
- [Census ClickHouse integration page](https://www.getcensus.com/integrations/clickhouse)
- [Census Reverse ETL overview](https://www.getcensus.com/reverse-etl)
- [ClickHouse CREATE USER documentation](https://clickhouse.com/docs/sql-reference/statements/create/user)
- ClickHouse MergeTree engine and LowCardinality type documentation
- ClickHouse network ports reference (native TLS on 9440)

## Issues Found
No technical issues found.

Key verifications:
- Census does support ClickHouse as a reverse ETL source connector.
- ClickHouse native TLS port 9440 is correct.
- `CREATE USER ... IDENTIFIED WITH sha256_password BY '...' HOST IP '<cidr>'` is valid ClickHouse syntax.
- `GRANT SELECT ON analytics.* TO <user>` is valid.
- SQL model using `sum`, `count(DISTINCT)`, `max`, `CASE`, `JOIN`, and `GROUP BY` is valid ClickHouse SQL.
- `INTERVAL 30 DAY` is valid ClickHouse interval syntax.
- `MergeTree()` engine with `ORDER BY` clause and `LowCardinality(String)` column types are valid.
- Salesforce custom field naming convention (`__c` suffix) is correct.

## Review Notes
- The post uses `sha256_password` with a plain-text password, which ClickHouse will hash on insertion. This is supported but operators may prefer `sha256_hash` with a pre-computed hash in production scripts. Not an error, just a note.
- The `HOST IP '10.0.0.0/8'` restriction is a reasonable default for internal VPC access.
- Census's actual UI field labels may differ slightly from the textual configuration block shown, but the conceptual flow (source selection, connection details, SQL model, sync mapping) is accurate.
