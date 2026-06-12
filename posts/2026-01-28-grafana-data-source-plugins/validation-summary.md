# Validation Summary: How to Configure Grafana Data Source Plugins

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana data source plugins
- Grafana CLI and Docker/Kubernetes plugin installation
- Grafana provisioning YAML
- Prometheus data source
- InfluxDB data source and Flux
- Elasticsearch data source
- OpenSearch data source plugin
- Infinity data source plugin
- Grafana HTTP API

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana CLI documentation: https://grafana.com/docs/grafana/latest/administration/cli/
- Grafana plugin installation documentation: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- Grafana Docker configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana Prometheus data source configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana InfluxDB data source configuration: https://grafana.com/docs/grafana/latest/datasources/influxdb/configure/
- Grafana Elasticsearch data source configuration: https://grafana.com/docs/grafana/latest/datasources/elasticsearch/configure/
- Grafana OpenSearch plugin configuration: https://grafana.com/docs/plugins/grafana-opensearch-datasource/latest/configure/
- Grafana Infinity plugin configuration: https://grafana.com/docs/plugins/yesoreyeram-infinity-datasource/latest/configure/
- Grafana data source HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/
- Infinity data source query model reference: https://pkg.go.dev/github.com/yesoreyeram/grafana-infinity-datasource/pkg/models

## Issues Found
- Updated Grafana CLI examples from `grafana-cli` to the current `grafana cli` command form documented by Grafana.
- Replaced panel plugin examples with data source plugin examples so the installation section matches the post topic.
- Updated Docker and Kubernetes plugin installation examples from `GF_INSTALL_PLUGINS` runtime environment usage to the current `GF_PLUGINS_PREINSTALL` environment variable.
- Updated the Prometheus UI navigation path from the older Configuration menu to the current Connections > Data sources flow.
- Changed the InfluxDB 1.x provisioning example from deprecated top-level `database` to `jsonData.dbName`.
- Changed the Elasticsearch provisioning example from deprecated top-level `database` to `jsonData.index`, and removed outdated `esVersion` and deprecated frozen-index configuration.
- Quoted the OpenSearch plugin `version` value to match the documented string format.
- Corrected the Infinity data source provisioning example to include `auth_method: bearerToken`, `allowedHosts`, and `timeoutInSeconds`.
- Added `parser` and `format` fields to the Infinity query JSON example so it more closely matches the plugin query model.
- Corrected the Prometheus cache example to use documented `cacheLevel` values and clarified that it controls browser caching for editor queries.

## Review Notes
- Grafana data source health checks are plugin-dependent; the documented `/api/datasources/uid/:uid/health` endpoint is correct, but not every plugin is required to implement a health check.
- All fenced YAML and JSON snippets were syntax-checked after the corrections.
