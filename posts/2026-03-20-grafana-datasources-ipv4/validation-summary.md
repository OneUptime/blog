# Validation Summary: How to Configure Grafana Data Sources with IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Grafana provisioning
- Grafana data source HTTP API
- Prometheus
- InfluxDB
- Loki
- Alertmanager
- MySQL
- PostgreSQL

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana InfluxDB data source configuration: https://grafana.com/docs/grafana/latest/features/datasources/influxdb/
- Grafana MySQL data source configuration: https://grafana.com/docs/grafana/latest/datasources/mysql/configure/
- Grafana PostgreSQL data source configuration: https://grafana.com/docs/grafana/latest/datasources/postgres/configure/
- Grafana Alertmanager data source configuration: https://grafana.com/docs/grafana/latest/datasources/alertmanager/
- Grafana data source HTTP API reference: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana data source management documentation: https://grafana.com/docs/grafana/latest/datasources/

## Issues Found
- The introduction said every data source uses a URL. That is not accurate for SQL data sources such as MySQL and PostgreSQL, which use `host:port` values in Grafana provisioning. I corrected the wording to distinguish HTTP-based sources from SQL backends.
- The multiple Prometheus example used `customQueryParameters` values of `cluster=production` and `cluster=staging` as if they were generic Prometheus parameters. Grafana documents this setting for URL-encoded parameters supported by the Prometheus-compatible backend, but those example parameters are not standard Prometheus query parameters. I removed them to avoid a misleading configuration example.
- The MySQL/PostgreSQL and Alertmanager YAML snippets were missing `apiVersion: 1`, which is required at the root of Grafana provisioning files. I added it so the examples are valid standalone provisioning snippets.
- The “Test a specific data source” command used `GET /api/datasources/name/:name`, which is deprecated, and it only fetched the data source definition instead of testing health. I changed the example to resolve the data source UID first and then call `GET /api/datasources/uid/:uid/health`, which matches the command description.
- The UI navigation and success message were from older Grafana UI flows. I updated them to the current `Connections` flow and the current Prometheus success message shown in Grafana documentation.
- The conclusion implied `access: proxy` was a universal rule for all data sources. In Grafana, that setting applies to HTTP-based data sources, not SQL data sources. I narrowed the wording accordingly.

## Review Notes
- Grafana’s legacy `/api/datasources` endpoints remain functional, but Grafana documents `/api` routes as deprecated starting in Grafana 13. The post now avoids the deprecated name-based lookup endpoint, but the remaining list and health examples still use legacy routes because Grafana has not provided a complete one-to-one replacement for every legacy data source operation.
- The InfluxDB example matches the InfluxDB 1.x / InfluxQL-style provisioning format that Grafana documents with `dbName` and `httpMode`. InfluxDB 2.x/3.x configurations use different fields and authentication settings.
