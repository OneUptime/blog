# Validation Summary: How to Build Database Normalization Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Relational database normalization
- First, Second, and Third Normal Form
- Boyce-Codd Normal Form
- SQL DDL and aggregate queries
- PostgreSQL-specific SQL features, including JSONB
- Mermaid ER and flowchart diagrams

## Sources Consulted
- Microsoft database normalization description: https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/access/database-normalization-description
- IBM database normalization overview: https://www.ibm.com/think/topics/database-normalization
- PostgreSQL constraints documentation: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL CREATE TABLE AS documentation: https://www.postgresql.org/docs/current/sql-createtableas.html
- PostgreSQL SELECT and GROUP BY documentation: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL materialized views documentation: https://www.postgresql.org/docs/current/rules-materializedviews.html
- PostgreSQL index-only scans and covering indexes documentation: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- Mermaid entity relationship diagram documentation: https://mermaid.ai/open-source/syntax/entityRelationshipDiagram.html
- Mermaid flowchart documentation: https://mermaid.ai/open-source/syntax/flowchart.html

## Issues Found
- The 3NF example claimed that state depends on city and country depends on state. That is not generally valid because city and state names are not guaranteed to be globally unique determinants. Updated the example to store `city_id`, `city_name`, `state`, and `country` in `customers_bad`, then explained the transitive dependency as `customer_id -> city_id -> city attributes`.
- The final schema used `line_price` and the reporting query summed `line_price`, but the comment only said it was a snapshot at order time. Clarified the comment to say it is a line total snapshot, which matches the later `SUM(oi.line_price)` query.

## Review Notes
- The SQL examples were reviewed as PostgreSQL-compatible because the post uses `JSONB`. The generic DDL examples use standard constructs supported by PostgreSQL, including primary keys, unique constraints, foreign keys, `DECIMAL`, `DATE`, `TIMESTAMP`, `GROUP BY`, and `CREATE TABLE AS SELECT`.
- PostgreSQL was not available locally in this workspace, so SQL was reviewed against official PostgreSQL documentation rather than executed against a local server.
