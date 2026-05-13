# Validation Summary: Flux CD vs ArgoCD: Which Has Better Monitoring Integration

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PodMonitor CRDs
- Grafana
- kube-prometheus-stack

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux alerts documentation: https://fluxcd.io/flux/monitoring/alerts/
- Flux monitoring example PodMonitor manifest: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD metrics source documentation: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/metrics.md
- Argo CD security/auditing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Grafana dashboard library entries for Flux dashboard IDs 16714 and 16715: https://grafana.com/grafana/dashboards/

## Issues Found
- The Flux scrape example used a ServiceMonitor. Flux's current monitoring example uses a PodMonitor for controller pods, so the snippet was updated to `kind: PodMonitor` with `podMetricsEndpoints`.
- The Flux controller list omitted `image-automation-controller` and `image-reflector-controller` while describing all controllers. Added both controllers to the PodMonitor selector.
- The `gotk_resource_info` example used `kind` as a label. Flux documents `customresource_kind` for this kube-state-metrics resource metric, so the example was corrected.
- The Argo CD metrics section described only two endpoints. Current Argo CD metrics documentation also includes repo-server metrics, so the text and ServiceMonitor examples were updated.
- The Argo CD repo-server metric was incorrectly written as `argocd_repo_pending_requests_total`. Corrected it to `argocd_repo_pending_request_total`.
- The `argocd_app_sync_total` metric was described as sync duration. It is a sync history counter, so the label was corrected and `argocd_app_sync_duration_seconds_total` was added for duration context.
- The Argo CD dashboard wording claimed dashboards are bundled with the Helm chart. Current official docs point to an example dashboard JSON, so the wording and comparison table were corrected.
- The comparison table referred to a UI audit log. Official Argo CD auditing docs describe Git history, Kubernetes Events, and API logs, so this was changed to API/audit logs.
- The Flux slow reconciliation alert queried `gotk_reconcile_duration_seconds{quantile="0.99"}`, but Flux exposes reconciliation duration as a histogram. The alert was changed to use `histogram_quantile()` over `gotk_reconcile_duration_seconds_bucket`.
- The prerequisites only mentioned ServiceMonitor CRDs. Updated to include PodMonitor CRDs because the Flux scrape example now correctly uses PodMonitor.
- The conclusion claimed equivalent metric depth. This was softened to "strong metric coverage" because the tools expose different metric surfaces and Flux resource-state metrics depend on kube-state-metrics configuration.

## Review Notes
The examples are generally version-neutral for current Flux and Argo CD, but Prometheus Operator resource selection still depends on each cluster's Prometheus `serviceMonitorSelector` and `podMonitorSelector` labels.
