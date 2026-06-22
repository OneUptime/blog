# Validation Summary: How to Deploy Loki on Kubernetes with Helm

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Grafana Loki
- Kubernetes
- Helm
- Grafana Community Loki Helm chart
- Legacy Loki Stack Helm chart
- Promtail
- Grafana Alloy
- Object storage backends: AWS S3, Google Cloud Storage, Azure Blob Storage, MinIO
- Grafana data sources
- LogQL

## Sources Consulted
- Grafana Loki Helm install documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki microservices Helm documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-microservices/
- Grafana Loki Helm chart values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki storage configuration documentation: https://grafana.com/docs/loki/latest/setup/install/helm/configure-storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Community Helm chart repository index: https://grafana-community.github.io/helm-charts/index.yaml
- Grafana Helm chart repository index: https://grafana.github.io/helm-charts/index.yaml

## Issues Found
- The post used the older `grafana/loki` chart repository for the main Loki chart. Updated main Loki chart commands to `grafana-community/loki` and added the `grafana-community` repository, while keeping `grafana` for legacy loki-stack and Promtail charts.
- The prerequisites listed Kubernetes 1.21+. Updated this to Kubernetes 1.25+ to match the current Loki chart `kubeVersion`.
- The chart search output showed outdated chart versions and older chart names. Updated it to current representative entries for `grafana-community/loki`, deprecated `grafana/loki-stack`, and deprecated `grafana/promtail`.
- The post presented loki-stack as suitable for small production use. Updated the wording to state that loki-stack is deprecated and should be limited to legacy or development deployments.
- The single binary example used `deploymentMode: SingleBinary`, which has been renamed to `Monolithic` in current chart guidance. Updated the section title, explanation, and value.
- The loki-stack retention example used Table Manager retention with TSDB. Updated the example to use compactor retention and `limits_config.retention_period`, which is the documented retention path for TSDB.
- The distributed example set `rulerConfig.storage`, which can override chart-generated ruler storage config. Removed the explicit ruler storage override and kept `alertmanager_url`.
- The distributed example expected a single ingester StatefulSet layout but did not disable zone-aware replication. Added `ingester.zoneAwareReplication.enabled: false` to match the example topology.
- Promtail was presented as the default collector for new deployments. Added the official EOL caveat and noted Grafana Alloy as the recommended collector for new deployments.
- The MinIO example omitted the current Loki chart `ignoreMinioDeprecation: true` escape hatch. Added the required value and caveat for chart v17+.
- The upgrade commands referenced `grafana/loki`; updated them to `grafana-community/loki` and clarified that `helm diff` requires the helm-diff plugin.
- The conclusion still recommended loki-stack and Promtail without caveats. Updated the takeaways to reflect deprecated/legacy status and current collector guidance.

## Review Notes
The post remains a useful Loki deployment tutorial, but it includes legacy loki-stack and Promtail examples. Those are technically marked as deprecated/EOL by Grafana documentation, so future revisions should consider replacing the legacy sections with Grafana Alloy examples and a single current chart flow.
