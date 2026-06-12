# Validation Summary: How to Monitor Flux Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux CLI
- Prometheus and Prometheus Operator
- kube-state-metrics
- Grafana dashboards
- Alertmanager
- Flux notification-controller
- OneUptime webhook and metrics integrations

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API v1beta3 reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kubebuilder controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference
- Grafana dashboard catalog entries for Flux dashboards: https://grafana.com/grafana/dashboards/

## Issues Found
- The Flux CLI verification command used `flux --version`; changed it to the documented `flux version --client`.
- The `flux check` example showed an older Kubernetes requirement; updated the example to a current supported Kubernetes version.
- The GitRepository detail command used `flux get source git`; changed it to the documented `flux get sources git`.
- The metrics setup patched controller arguments to enable metrics, but Flux controllers expose metrics on port 8080 by default. Replaced this with a Prometheus Operator `PodMonitor`.
- The Prometheus scrape example used `ServiceMonitor`, but Flux's official monitoring setup uses `PodMonitor` for controller pods. Updated the section and YAML.
- Several PromQL examples used removed/old Flux resource metrics such as `gotk_reconcile_condition` and `gotk_suspend_status`. Replaced them with current kube-state-metrics-based `gotk_resource_info` queries.
- The reconciliation duration metric label list included a nonexistent `success` label. Corrected the documented labels.
- Grafana and alert queries used old readiness metrics. Updated them to use `gotk_resource_info`.
- The Grafana import command used a nonexistent `grafana-cli dashboards install` command and stale dashboard IDs. Replaced it with UI/provisioning guidance and current community dashboard IDs.
- Prometheus alert rules used old Flux resource metrics and label names. Updated them to use `gotk_resource_info` and the correct labels such as `customresource_kind` and `exported_namespace`.
- Alertmanager routes used invalid/deprecated matcher syntax. Updated them to `matchers`.
- The Alertmanager PagerDuty example used `service_key`; changed it to `routing_key` for PagerDuty Events API v2 usage.
- Flux notification manifests used `notification.toolkit.fluxcd.io/v1`, which is not the current documented API version. Updated them to `notification.toolkit.fluxcd.io/v1beta3`.
- Slack provider examples used an incoming webhook secret with the `slack` provider. Updated them to use the Slack API endpoint and bot token as shown in Flux's provider documentation.
- Flux Alert examples used deprecated `spec.summary`. Moved summary text into `spec.eventMetadata.summary`.
- The OneUptime generic webhook secret used an unused `token` key. Changed it to a supported `headers` key with an Authorization header.

## Review Notes
The monitoring examples now assume kube-state-metrics is configured to export Flux custom resource metrics. The post could be improved in the future by adding the kube-state-metrics `customResourceState` configuration, but that would be a new section rather than a targeted correctness fix.
