# Validation Summary: How to Use ClickHouse with Open Source BI Tools

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- Apache Superset
- Metabase
- Grafana
- Redash (mentioned)
- clickhouse-connect (Python SQLAlchemy driver)
- clickhouse-sqlalchemy + clickhouse-driver (Python native protocol driver)
- Grafana ClickHouse datasource plugin

## Sources Consulted
- Apache Superset ClickHouse documentation: https://superset.apache.org/user-docs/databases/supported/clickhouse/
- clickhouse-connect GitHub: https://github.com/ClickHouse/clickhouse-connect
- clickhouse-sqlalchemy GitHub: https://github.com/xzkostyan/clickhouse-sqlalchemy
- ClickHouse Metabase driver GitHub: https://github.com/ClickHouse/metabase-clickhouse-driver
- Grafana ClickHouse plugin: https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/
- Grafana ClickHouse plugin GitHub: https://github.com/grafana/clickhouse-datasource
- ClickHouse Grafana integration docs: https://clickhouse.com/docs/integrations/grafana

## Issues Found

1. **Superset native protocol URI attributed to wrong package**: The post implied that both the `clickhousedb://` and `clickhouse+native://` URI schemes were available after installing `clickhouse-connect`. In reality, `clickhousedb://` is from `clickhouse-connect` (HTTP protocol), while `clickhouse+native://` requires the separate `clickhouse-sqlalchemy` and `clickhouse-driver` packages (native TCP protocol). Fixed by adding the correct `pip install` command for the native protocol packages before the `clickhouse+native://` URI example.

2. **Metabase driver installation instructions outdated**: The post instructed users to manually download a ClickHouse driver JAR for Metabase. Since Metabase 54 (released early 2025), the ClickHouse driver is bundled as a built-in core driver, and the standalone driver repository was archived in June 2025. Fixed by noting that Metabase 54+ includes the driver out of the box, and keeping the manual JAR installation instructions only for older Metabase versions.

## Review Notes
- The Grafana plugin ID `grafana-clickhouse-datasource` and the `$__fromTime`/`$__toTime` macros are correct. The `$service` reference in the Grafana query is a standard user-defined dashboard template variable, not a plugin-provided macro — this is a valid usage pattern but could be clarified for less experienced Grafana users.
- The Superset Jinja template syntax `{{ filter_values('date_range')[0] }}` is a valid Superset SQL Lab macro for referencing dashboard filter values.
- The `grafana-cli plugins install` command is still functional but Grafana 10+ recommends using the Plugin Catalog UI (Connections > Add new connection) as the primary installation method.
- The ClickHouse SQL syntax used throughout (toDate, toStartOfMinute, count(), countIf, CREATE VIEW, GRANT) is all correct.
