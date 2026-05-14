# Validation Summary: How to Configure Flux CD with Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Google Kubernetes Engine
- Google Cloud Managed Service for Prometheus
- Google Cloud Monitoring
- Kubernetes PodMonitoring and ClusterPodMonitoring resources
- Prometheus and PromQL
- gcloud CLI

## Sources Consulted
- Google Cloud Managed Service for Prometheus setup guide: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- Google Cloud Managed Service for Prometheus manifest reference: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/manifests
- Google Cloud Monitoring dashboard API examples: https://cloud.google.com/monitoring/dashboards/api-examples
- Google Cloud PromQL alerting policy API guide: https://cloud.google.com/monitoring/promql/create-promql-alerts
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux bootstrap command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux installation manifests from the official fluxcd/flux2 release artifacts: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml

## Issues Found
- The post used `gotk_reconcile_condition` and `gotk_suspend_status` in the key metrics, dashboard, and alert examples, but the current Flux metrics documentation distinguishes controller-exported metrics from resource-state metrics collected through kube-state-metrics. Because this guide only configures GMP to scrape Flux controller pods, those resource-state metrics are not guaranteed to exist. I changed the dashboard and alert examples to use `controller_runtime_reconcile_total` and updated the key metrics table to list controller-exported metrics.
- The per-controller PodMonitoring examples omitted `notification-controller`, which is part of the default Flux bootstrap components. I added a matching `PodMonitoring` example for it.
- The `ClusterPodMonitoring` example described `targetLabels` as targeting only the `flux-system` namespace. The official CRD reference defines `targetLabels` as metadata labels added to scraped targets, not as namespace selection. I corrected the comment and included `namespace` as a metadata label.
- The high-cardinality `labeldrop` example included `sourceLabels`, which is not how Prometheus `labeldrop` is normally expressed. I changed it to use `regex: "revision"` with `action: labeldrop`.
- The managed collection statement was imprecise and the alerting command used the older alpha command group. I updated the wording to match the current GKE Standard default and changed the command to `gcloud monitoring policies create`.

## Review Notes
The post is accurate after the fixes for the controller-metrics workflow it describes. If the author wants resource readiness and suspension dashboards in the future, the guide should add a kube-state-metrics custom-resource-state setup for Flux resources rather than relying only on controller pod scraping.
