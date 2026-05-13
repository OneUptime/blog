# Validation Summary: How to Build a Monitoring Platform with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 (source-controller, helm-controller, kustomize-controller)
- Kubernetes
- Helm (kube-prometheus-stack chart)
- Prometheus / Prometheus Operator (PrometheusRule, ServiceMonitor CRDs)
- Grafana (sidecar-loaded dashboards via ConfigMaps)
- Alertmanager (Slack, PagerDuty receivers)
- node_exporter metrics
- GitOps

## Sources Consulted
- Flux HelmRelease API reference — https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease "Values overrides" docs — https://fluxcd.io/flux/components/helm/helmreleases/#values-overrides
- fluxcd/pkg `chartutil/values.go` (`ReplacePathValue` → Helm `strvals.ParseInto`) — https://github.com/fluxcd/pkg/blob/main/chartutil/values.go
- fluxcd/helm-controller issue #460 (request to YAML-parse `targetPath` values; not implemented) — https://github.com/fluxcd/helm-controller/issues/460
- prometheus-community/helm-charts `kube-prometheus-stack` values & alertmanager templates — https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- prometheus-operator AlertmanagerSpec docs (`configSecret` semantics, `alertmanager.yaml` key) — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.AlertmanagerSpec
- Flux monitoring metrics (`gotk_reconcile_condition`, `gotk_reconcile_duration_seconds`, `gotk_suspend_status`) — https://fluxcd.io/flux/monitoring/metrics/
- Grafana sidecar dashboard loading (kiwigrid sidecar; default label `grafana_dashboard`) — kube-prometheus-stack Grafana values
- Alertmanager configuration reference — https://prometheus.io/docs/alerting/latest/configuration/
- node_exporter metrics (`node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`) — https://github.com/prometheus/node_exporter

## Issues Found

1. **Broken `valuesFrom` + `targetPath` pattern for the Alertmanager config (Step 2 and Step 5).** The post injected a multi-line Alertmanager YAML config into `alertmanager.config` via:

   ```yaml
   valuesFrom:
     - kind: Secret
       name: alertmanager-config
       valuesKey: config.yaml
       targetPath: alertmanager.config
   ```

   This does not work. Flux's helm-controller implements `targetPath` by calling Helm's `strvals.ParseInto` (the same parser behind `helm --set`) on the literal string `"<targetPath>=<raw secret content>"`. That parser handles flat scalars and dotted paths — it does not YAML-decode multi-line blocks containing colons, hashes, and newlines. Even if the parse succeeded, kube-prometheus-stack's `alertmanager/secret.yaml` template calls `toYaml .Values.alertmanager.config` expecting a map, so a string would be double-encoded as a quoted scalar inside the rendered `alertmanager.yaml`. Open upstream issue: fluxcd/helm-controller#460.

   **Fix applied:** Removed the `valuesFrom` block from the HelmRelease and used the idiomatic Prometheus Operator pattern instead — set `alertmanager.alertmanagerSpec.configSecret: alertmanager-config` in the chart values. With `configSecret`, the operator mounts the externally managed Secret directly at `/etc/alertmanager/config/alertmanager.yaml`, skipping the chart's templated Secret. This is exactly the "keep credentials outside the HelmRelease" outcome the original example was reaching for, and it actually works.

2. **Wrong Secret data key (Step 5).** The Secret used `stringData.config.yaml`. The Prometheus Operator's `AlertmanagerSpec.configSecret` requires the configuration to live under the key `alertmanager.yaml` (it mounts that exact key into the pod). With the original key name the Alertmanager pod would start with the chart's default empty config instead of the routes defined in the post.

   **Fix applied:** Renamed the data key from `config.yaml` to `alertmanager.yaml` and added an inline comment explaining where the operator mounts it.

## Review Notes

- **Chart version `"58.x"` is older than current.** kube-prometheus-stack v58 was released around April 2024; as of mid-2026 the chart is well past v70. The post's pinning still resolves to a real, working release and the API surface used (`prometheusSpec`, `alertmanagerSpec`, `grafana.sidecar.dashboards`, `configSecret`) is stable across these versions, so left as-is. Readers should consider bumping when adopting.
- **`ruleSelector: {}` plus labels on PrometheusRule.** The post sets `ruleSelector: {}` (empty selector matches everything) but still attaches `prometheus: kube-prometheus` / `role: alert-rules` labels on PrometheusRule with a comment saying they "must match the ruleSelector". With an empty selector the labels are not required. Harmless and forward-compatible if the selector is tightened later, so left untouched.
- **Alertmanager `match:` syntax.** The post uses the older `match:` keyword on routes. Alertmanager 0.22+ prefers `matchers:` (PromQL-style); `match:` is still accepted and not deprecated as of upstream 0.27, so this is fine but readers may want to migrate.
- **PagerDuty `routing_key: ${PAGERDUTY_KEY}` and Grafana `adminPassword: ${GRAFANA_ADMIN_PASSWORD}`.** These `${...}` placeholders are not auto-substituted by Alertmanager or by the Helm chart. They rely on Flux's Kustomization-level variable substitution (`spec.postBuild.substitute` / `substituteFrom`), which the post does not show being enabled on the monitoring Kustomization. The Best Practices section's recommendation to use External Secrets Operator is the more robust path. Not flagged as a fix because the substitution mechanism is upstream of this post's scope.
- **PromQL single-quoted label values inside the dashboard JSON (`type='Ready'`).** Accepted by the Prometheus parser, so technically valid, though double quotes are the canonical form.
- **`node_memory_MemAvailable_bytes` / `node_memory_MemTotal_bytes`** are correct node_exporter metric names; the high-memory expression is sound.
- **Flux metrics referenced (`gotk_reconcile_condition`, `gotk_reconcile_duration_seconds_bucket`, `gotk_suspend_status`)** are all real and exposed by Flux controllers, with the labels used in the post.
