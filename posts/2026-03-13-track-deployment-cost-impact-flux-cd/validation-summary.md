# Validation Summary: How to Track Deployment Cost Impact with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD notification-controller Alerts and Providers
- Kubernetes Deployments, Secrets, CronJobs, and Events
- OpenCost allocation API
- Prometheus Operator PrometheusRule resources
- Prometheus alerting rules and PromQL
- kube-state-metrics resource request metrics
- Flux CLI and kubectl

## Sources Consulted
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI `get` documentation: https://fluxcd.io/flux/cmd/flux_get/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost installation/access documentation: https://opencost.io/docs/installation/install/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md

## Issues Found
- The Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation keeps Provider and Alert examples on `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests to `v1beta3`.
- The Flux `Alert` `eventSources` entries omitted the required `name` selector. Added `name: "*"` for both HelmRelease and Kustomization event sources.
- The Flux `Alert` used `spec.summary`, which Flux documents as deprecated in favor of `spec.eventMetadata.summary`. Replaced it with `eventMetadata.summary`.
- The OpenCost CronJob queried the allocation API on port `9090`, which is the UI port in the official OpenCost docs. Changed the API URL to port `9003`.
- The Prometheus section described the example alerts as namespace cost spike alerts, but the PromQL expressions detect resource request spikes from kube-state-metrics. Updated the wording to describe namespace resource request spikes.
- The Flux CLI example used `flux get helmrelease`; the documented command is `flux get helmreleases`. Updated the command.
- The HelmRelease status example queried `.status.lastAppliedRevision`, which is not present in the current HelmRelease v2 status API. Updated it to `.status.lastAttemptedRevision` and adjusted the comment accordingly.

## Review Notes
The Prometheus rules are technically valid as resource-request regression signals, but they are not direct OpenCost cost alerts. A future enhancement could query or export OpenCost allocation data into Prometheus and alert on actual cost metrics.
