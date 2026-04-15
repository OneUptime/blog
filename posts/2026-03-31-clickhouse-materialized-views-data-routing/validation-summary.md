# Validation Summary: How to Use Materialized Views for Data Routing in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Null engine, MergeTree engine, Materialized Views)
- ClickHouse JSON functions (JSONExtractString, JSONExtractFloat)
- ClickHouse dictionary functions (dictGetString)
- LowCardinality data type
- SQL DDL and DML

## Sources Consulted
- ClickHouse Null engine documentation: https://clickhouse.com/docs/en/engines/table-engines/special/null
- ClickHouse Materialized View documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse cascading materialized views guide (confirms multiple MVs on one source and Null engine + MV interaction)
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse external dictionary functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
No technical issues found.

## Review Notes
- `dictGetString` (used in the "Routing with Transformation" section) is valid and not deprecated, but the more modern generic `dictGet` function is now the preferred alternative. Both work correctly; this is a stylistic preference, not an error.
- The `dictGetString` example passes a `String` key (from `JSONExtractString`) as the dictionary lookup key. This is valid only if the referenced dictionary (`currency_dict`) is configured with a String-type key. Since the dictionary definition is not shown, the reader should be aware of this dependency.
- The tenant routing section references destination tables (`events_tenant_acme`, `events_tenant_other`) and the priority routing section references `critical_errors` without showing their CREATE TABLE statements. This is intentional for brevity but readers will need to create these tables before using the MVs.
