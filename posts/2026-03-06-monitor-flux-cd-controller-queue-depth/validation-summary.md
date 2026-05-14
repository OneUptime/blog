# Validation Summary: How to Monitor Flux CD Controller Queue Depth

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Flux CD controllers
- Kubernetes controller workqueues
- Prometheus and PromQL
- Prometheus Operator PodMonitor, ServiceMonitor, and PrometheusRule resources
- Grafana dashboards
- Kubernetes Kustomize patches
- Flux controller scaling and sharding

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough for custom metrics: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- The post recommended a ServiceMonitor that selected Flux Services by `app.kubernetes.io/part-of: flux` and scraped `http-prom`. Flux's documented monitoring setup uses a PodMonitor for controller Pods, and default Flux Services do not expose every controller's metrics port. Changed the primary example to a PodMonitor matching Flux controller `app` labels, and made ServiceMonitor an alternative for installations that explicitly expose metrics Services.
- The histogram quantile PromQL examples used raw `_bucket` rates without aggregation. Prometheus documentation requires retaining the `le` label when aggregating classic histograms. Updated queue latency and work-duration quantile examples, alert rules, and Grafana panel expressions to use `sum by (name, le) (...)`.
- The resource-scaling Deployment example was not a valid standalone `apps/v1` Deployment and would replace controller args if applied directly. Replaced it with a Kustomize patch aligned with Flux's documented bootstrap customization pattern.
- The resource-scaling example described `--events-addr` as an event rate-limit flag. Flux documents it as the events receiver address. Removed the misleading argument from the resource patch.
- The HPA example implied that increasing replicas of a Flux controller is the right way to respond to queue depth. Flux documents horizontal scaling through sharding with unique `--watch-label-selector` values. Replaced the HPA example with a sharding-oriented Kustomize example and updated the best-practices summary.

## Review Notes
Queue-depth thresholds such as 50 and 200 are environment-specific. They are usable as examples, but production alert thresholds should be tuned from observed baseline reconciliation behavior and controller resource limits.
