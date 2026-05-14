# Validation Summary: How to Deploy Logging Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Grafana Loki
- Grafana Alloy
- Grafana datasource provisioning
- Prometheus Operator PrometheusRule resources
- S3-compatible object storage

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Grafana Loki Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki microservices Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-microservices/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki get started guide: https://grafana.com/docs/loki/latest/get-started/
- Grafana Alloy Kubernetes installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/collect/logs-in-kubernetes/
- Grafana Alloy `loki.process` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Alloy Helm chart values: https://github.com/grafana/alloy/blob/main/operations/helm/charts/alloy/values.yaml
- Grafana Loki Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/loki/values.yaml

## Issues Found
- Promtail was used as the log collector even though Grafana documents Promtail as deprecated, with LTS ending February 28, 2026 and EOL on March 2, 2026. Replaced the Promtail section and references with Grafana Alloy, the current Grafana-recommended Kubernetes log collector.
- The Loki chart repository and deployment mode were outdated for current Loki Helm chart documentation. Updated the Loki repository to `https://grafana-community.github.io/helm-charts`, changed the chart version family to `13.x`, and changed `deploymentMode` from `SingleBinary` to `Monolithic`.
- The monolithic Loki values did not zero all non-monolithic component replica counts documented by the current chart. Added the missing component replica overrides.
- The production distributed-mode example was incomplete for the current chart. Added `queryScheduler`, `indexGateway`, simple scalable component disables, bloom component disables, and disabled ingester zone-aware replication in line with the documented development example.
- The PrometheusRule section described log-based alerting but used PrometheusRule with a Loki log label selector. PrometheusRule evaluates PromQL, not LogQL. Renamed the section to Loki health alerting and changed the example to metric-based Loki health alerts, with a note that log-based alerts belong in Grafana or Loki ruler.
- The Alloy tolerations were initially placed at the wrong chart values path during remediation. Corrected them to `controller.tolerations`.

## Review Notes
- The snippets are syntactically valid YAML.
- The Loki S3 bucket names and IAM role ARN remain placeholders and must be replaced for a real deployment.
- The Grafana datasource ConfigMap assumes the Grafana sidecar is configured to watch `grafana_datasource: "true"` in the `monitoring` namespace.
