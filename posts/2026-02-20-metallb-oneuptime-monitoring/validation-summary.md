# Validation Summary: How to Monitor MetalLB with OneUptime

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Kubernetes
- MetalLB
- OneUptime monitors, synthetic monitors, status pages, incidents, and dashboards
- OpenTelemetry Collector
- Prometheus metrics and Kubernetes service discovery
- JavaScript monitor scripts
- kubectl

## Sources Consulted
- MetalLB Prometheus metrics: https://metallb.io/prometheus-metrics/
- MetalLB installation and Prometheus integration notes: https://metallb.io/installation/index.html
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB v0.15.3 standard manifests: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- MetalLB v0.15.3 Prometheus manifests: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native-prometheus.yaml
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus Kubernetes service discovery and relabeling configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OneUptime Synthetic Monitor documentation: https://oneuptime.com/docs/en/monitor/synthetic-monitor
- OneUptime Custom Code Monitor documentation: https://oneuptime.com/docs/en/monitor/custom-code-monitor
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector
- OneUptime monitoring product documentation: https://oneuptime.com/product/monitoring
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The synthetic monitor script used an unused `https` import, relied on `fetch`, wrapped the check in an async function, and called it without returning or awaiting the result. OneUptime's documented synthetic/custom-code script context provides `axios` and uses top-level `return`, so the example was changed to use `axios.get`, a 5-second timeout, explicit status validation, and a returned `data` object.
- The OpenTelemetry Collector Prometheus scrape config only selected MetalLB speaker pods. The later IP pool exhaustion alert depends on allocator metrics, which are exposed by MetalLB's controller-side metrics. The config now scrapes both controller and speaker pods.
- The scrape config did not restrict discovered pod targets to MetalLB's metrics port. With Kubernetes pod service discovery, each declared container port can become a target, so the config now keeps only the `monitoring` container port used by the standard MetalLB manifests.
- The OneUptime OTLP token comment described a project API key. OneUptime's OTLP examples use a telemetry ingestion token sent as the `x-oneuptime-token` header, so the wording and placeholder were corrected.

## Review Notes
The `kubectl apply -f` commands are syntactically correct, but the post still assumes the reader has an `otel-collector-deployment.yaml` with suitable RBAC for Kubernetes service discovery. That is acceptable for this guide, but a future revision could include a complete Deployment, ServiceAccount, ClusterRole, and ClusterRoleBinding example.
