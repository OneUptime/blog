# Validation Summary: How to Use Grafana Mimir for Multi-Cluster Metrics at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Mimir
- Grafana Mimir distributed Helm chart
- Prometheus and Prometheus Agent mode
- Prometheus Operator CRDs
- Grafana datasource provisioning
- Kubernetes Ingress, Services, ConfigMaps, and Secrets
- PromQL
- Alertmanager
- Amazon S3 object storage

## Sources Consulted
- Grafana Mimir Helm chart production guide: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/
- Grafana Mimir Helm chart configuration guide: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir Helm chart values and classic architecture preset: https://github.com/grafana/mimir/tree/main/operations/helm/charts/mimir-distributed
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir runtime configuration: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration/
- Grafana Mimir authentication and tenant federation: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Grafana Mimir HTTP API: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir ruler documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Grafana Mimir Alertmanager documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/alertmanager/
- Prometheus Agent mode documentation: https://prometheus.io/docs/prometheus/latest/prometheus_agent/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Helm CLI documentation: https://helm.sh/docs/

## Issues Found
- The opening description said Mimir replaces Prometheus. Updated it to clarify that Mimir acts as the remote metrics storage backend while Prometheus or Grafana Alloy still scrapes and forwards metrics.
- The post made an overly absolute query-performance claim. Reworded it to say Mimir can scale to hundreds of millions of active series when sized correctly.
- The Helm values used the old `nginx` component and `mimir-nginx` service name. Updated them to the current `gateway` component and `mimir-gateway` service.
- The current Mimir Helm chart enables ingest storage and Kafka by default. Added the classic architecture settings so the direct distributor-to-ingester architecture described in the post remains accurate.
- The object storage secret was created but not used by the Mimir pods, and the secret keys did not match the environment variable names in the values file. Added `global.extraEnvFrom` and changed the secret keys to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- Multi-tenant Grafana queries used pipe-separated tenant IDs without enabling Mimir tenant federation. Added `tenant_federation.enabled: true`.
- The tenant override snippet used an invalid `limits.overrides_config_file` setting and referenced an unmounted ConfigMap. Replaced it with the Helm chart's `runtimeConfig.overrides` value.
- The Prometheus remote write relabel example overwrote the `cluster` label despite `externalLabels.cluster` already being set. Changed it to add a separate `source` label.
- The rule upload payload used a full Prometheus rule file with `groups`, but Mimir's rule-group API expects one rule group at `/config/v1/rules/{namespace}`. Updated the payload to a single rule group.
- The rule and Alertmanager examples were shown as Kubernetes ConfigMaps while the commands uploaded local files with curl. Changed those examples to local `rules.yaml` and `alertmanager.yaml` payloads.
- The Alertmanager route examples used deprecated `match` syntax. Updated them to current `matchers` syntax.

## Review Notes
The examples are now technically consistent with the current Grafana Mimir distributed Helm chart and Mimir HTTP APIs. Helm and kubectl were not installed in this workspace, so CLI verification was performed against official documentation and upstream chart templates rather than local `--help` output.
