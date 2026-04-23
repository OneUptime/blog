# Validation Summary: How to Deploy Loki Stack on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL
- Alertmanager

## Sources Consulted
- Grafana Loki Helm install docs: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm chart docs: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki LogQL query docs: https://grafana.com/docs/loki/latest/query/log_queries/
- Promtail status docs showing EOL on March 2, 2026: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Helm chart README: https://github.com/grafana/alloy/tree/main/operations/helm/charts/alloy
- Collect Kubernetes logs with Grafana Alloy: https://grafana.com/docs/grafana-cloud/send-data/alloy/collect/logs-in-kubernetes/
- Grafana Alloy `loki.source.kubernetes` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy `loki.process` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Loki data source provisioning docs: https://grafana.com/docs/grafana/latest/features/datasources/loki/

## Issues Found
- The Loki Helm install instructions used the old `grafana/loki` chart path and values that no longer match the current chart guidance. I updated the post to use the current `grafana-community/loki` repository, added `deploymentMode: SingleBinary`, zeroed the other deployment-mode replicas, and corrected the chart keys for object storage and monitoring.
- The Loki values file used chart-incompatible storage fields such as `bucketnames`, `access_key_id`, `secret_access_key`, and `s3forcepathstyle`. I changed them to the chart-supported keys `bucketNames`, `accessKeyId`, `secretAccessKey`, and `s3ForcePathStyle`.
- The monolithic deployment example configured `singleBinary.replicas: 3` with `replication_factor: 2`. Current Loki Helm docs recommend matching the replication factor to the multi-replica single-binary deployment, so I changed it to `3`.
- Retention was enabled in the compactor config, but `delete_request_store` was missing. Current Loki retention docs require `delete_request_store` when retention is enabled, so I added `delete_request_store: s3`.
- The post presented Promtail as the log collector even though Promtail is officially end-of-life as of March 2, 2026. I replaced the Promtail section with a current Grafana Alloy DaemonSet example based on the official Alloy Helm chart and Kubernetes log collection docs.
- The old Promtail scrape configuration also contained incorrect or outdated details for Kubernetes metadata labels and would not have been the right recommendation for a March 2026 publication. The replacement Alloy config now uses the current `discovery.kubernetes`, `discovery.relabel`, `loki.source.kubernetes`, `loki.process`, and `loki.source.file` flow.
- The Grafana data source example assumed a Tempo link target without clarifying the UID relationship. I added an explicit `uid` for the Loki data source and clarified that the Tempo data source UID must match the `datasourceUid` used in the derived field.
- The log-based alerting example used a `PrometheusRule` CRD containing a LogQL expression. That is not the correct way to store Loki alert rules. I replaced it with Loki ruler rule files mounted through the Loki Helm chart’s `ruler.directories`, together with the required `loki.rulerConfig.storage` settings.
- The section titled “Configure Log Retention” actually used the log deletion API and the request format was wrong. I renamed the section to reflect log deletion and corrected the `curl` example to use the documented query-parameter form of `POST /loki/api/v1/delete`.
- The troubleshooting section referenced Promtail-specific target inspection. I updated it to Alloy-focused troubleshooting that matches the corrected collector choice.

## Review Notes
- The post now assumes a single-tenant Loki deployment with `auth_enabled: false`. In that mode, Loki uses the tenant ID `fake`, which is why the ruler rule directory is named `fake`.
- The Loki Helm docs now recommend microservices mode for larger production environments. The corrected post remains technically valid because it explicitly uses single-binary mode, but that mode is still best suited to smaller or simpler deployments.
- Rancher Monitoring must be configured to discover `ServiceMonitor` resources in the `observability` namespace for the `release: rancher-monitoring` labels in the examples to be effective.
