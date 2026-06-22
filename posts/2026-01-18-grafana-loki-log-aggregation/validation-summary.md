# Validation Summary: How to Implement Loki for Log Aggregation in Grafana

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- Grafana
- Grafana Loki Helm chart
- Kubernetes
- Helm
- Promtail
- Grafana Alloy
- LogQL
- Grafana Tempo derived fields
- AWS S3 object storage

## Sources Consulted
- Grafana Loki Helm chart installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki scalable Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki LogQL query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki Promtail EOL documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail pipeline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/metrics/
- Grafana Loki data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/loki/

## Issues Found
- The Helm repository and chart names were outdated. The post used `grafana/loki-stack` and `grafana/loki`; current Loki Helm documentation points to the community chart repository and `grafana-community/loki`. Updated the Helm repository and install commands.
- The introductory Helm command still installed the deprecated `loki-stack` chart and claimed it included Promtail. Replaced it with a current Loki chart install using `deploymentMode=Monolithic` and single-binary settings.
- The scalable S3 values used the wrong chart value shape for current Loki Helm chart storage settings. Added `loki.storage_config.aws`, changed `bucketnames` under `loki.storage.s3` to `bucketNames`, and changed S3 credential keys to `accessKeyId` and `secretAccessKey`.
- The custom-values Helm install command still referenced `grafana/loki`. Updated it to `grafana-community/loki`.
- The Promtail section described Promtail as the current collection agent. Added a note that Promtail is EOL as of March 2, 2026 and that Grafana Alloy should be used for new deployments.
- Grafana provisioning examples used `${__value.raw}` in YAML derived-field URLs. Grafana documentation requires escaping `$` as `$${__value.raw}` in provisioned YAML to avoid environment-variable interpolation. Updated both derived-field examples.
- The Loki ingester tuning example included `max_transfer_retries`, which is no longer present in the current Loki configuration reference. Removed it.

## Review Notes
The LogQL examples, retention/compactor settings, Promtail pipeline stages, Grafana data source structure, and multi-tenant `tenant_id` example are consistent with the referenced documentation. Promtail examples are retained as legacy guidance because the original article is Promtail-focused, but future revisions should prefer Grafana Alloy examples for new deployments.
