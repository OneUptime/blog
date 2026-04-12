# Validation Summary: How to Use MySQL with Grafana for Dashboard Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (data source, SQL syntax, indexing)
- Grafana (data source configuration, macros, variables, panel types)

## Sources Consulted
- Grafana MySQL data source documentation: https://grafana.com/docs/grafana/latest/datasources/mysql/
- Grafana template variables documentation: https://grafana.com/docs/grafana/latest/dashboards/variables/
- MySQL CREATE USER / GRANT documentation: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL CREATE INDEX documentation: https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
1. **Incorrect index terminology in SQL comment**: The SQL comment on the `ALTER TABLE` statement described the index as a "covering index," but it is a composite (compound) index. A covering index must include all columns referenced by a query so the engine can satisfy the query entirely from the index without a table lookup. The index `(service_name, created_at)` helps with filtering but does not cover the additional columns read by the example queries (e.g., `response_time_ms`, `status_code`, `endpoint`). Changed "covering" to "composite" in the SQL comment to match the correct terminology already used in the prose.

## Review Notes
- In Grafana 10+, the navigation path for adding data sources changed from "Configuration > Data Sources" to "Connections > Data sources." The post uses the older path, which still applies to Grafana 9.x and earlier. This is not incorrect but may confuse users on newer Grafana versions.
- The SQL queries use double-quoted aliases (e.g., `AS "time"`), which is consistent with Grafana's official MySQL documentation examples. In standard MySQL, double quotes act as string delimiters unless `ANSI_QUOTES` SQL mode is enabled; Grafana's MySQL plugin handles this correctly.
- All Grafana macros (`$__timeFilter`, `$__timeGroup`, `$__timeFrom`, `$__timeTo`, `$__interval`) are used correctly and match official documentation.
- The `$__timeFilter` expansion example using `FROM_UNIXTIME()` is accurate for the Grafana MySQL plugin.
- The multi-value variable usage with `IN ($service_name)` is correct per Grafana's variable interpolation behavior.
