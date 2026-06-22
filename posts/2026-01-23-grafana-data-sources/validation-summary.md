# Validation Summary: How to Configure Data Sources in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana data sources and provisioning
- Prometheus
- Loki
- Tempo
- InfluxDB
- PostgreSQL
- Kubernetes ConfigMaps and Secrets
- kubectl
- PromQL

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Loki data source documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Tempo data source documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/
- Grafana Tempo provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana InfluxDB data source documentation: https://grafana.com/docs/grafana/latest/datasources/influxdb/configure/
- Grafana PostgreSQL data source documentation: https://grafana.com/docs/grafana/latest/datasources/postgres/configure/
- Kubernetes kubectl create secret generic documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Grafana v9 upgrade guide for browser access mode removal notes: https://grafana.com/docs/grafana/latest/upgrade-guide/upgrade-v9.0/

## Issues Found
- The Grafana UI navigation path used the older "Configuration > Data Sources" wording. Updated it to the current "Connections > Data sources > Add new data source" path.
- The Loki derived field example mixed an internal Tempo data source link with an external Tempo trace URL. Updated the URL to `${__value.raw}` so Grafana treats it as a query for the selected Tempo data source.
- The provisioning example did not assign a `uid` to the Loki data source even though the Tempo `tracesToLogsV2.datasourceUid` referenced `loki`. Added `uid: loki`.
- The Loki provisioning example used `${__value.raw}` directly. Grafana provisioning interpolates environment variables from `$`, so changed it to `$${__value.raw}`.
- The Tempo provisioning example used port `3100`, which is Loki's default HTTP port. Updated Tempo to the documented self-managed HTTP port `3200`.
- The Tempo provisioning example used the older `tracesToLogs` block and obsolete tag mapping fields. Updated it to `tracesToLogsV2` with the current tag mapping format.
- The PostgreSQL connectivity test referenced `app_db`, while the rest of the post uses `application_db`. Updated the command to use `application_db` and a temporary PostgreSQL client pod instead of assuming `psql` exists in the Grafana container.
- The timeout provisioning example used `queryTimeout`, which is not listed in Grafana's common provisioning fields. Updated it to `timeout`, the documented HTTP request timeout field.

## Review Notes
The post is technically relevant and mostly accurate. Browser/direct access is still described in Grafana provisioning as `direct`, but some data sources no longer support it, so the existing caution to prefer server/proxy mode is appropriate.
