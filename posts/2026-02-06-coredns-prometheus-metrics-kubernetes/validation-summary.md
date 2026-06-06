# Validation Summary: How to Configure the OpenTelemetry Collector to Scrape CoreDNS Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector processors
- CoreDNS Prometheus metrics
- Prometheus Kubernetes service discovery
- Kubernetes Deployments, ConfigMaps, Services, RBAC, Pods, and EndpointSlices
- kubectl

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib
- Prometheus configuration documentation for Kubernetes service discovery: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- CoreDNS Prometheus plugin documentation: https://coredns.io/plugins/metrics/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Amazon EKS CoreDNS metrics documentation: https://docs.aws.amazon.com/eks/latest/userguide/coredns-metrics.html

## Issues Found
- The Collector image was pinned to `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated. Updated it to `otel/opentelemetry-collector-contrib:0.153.0`, the current Contrib release available during validation.
- The `role: pod` scrape config rewrote every matching CoreDNS pod target to `:9153`. Prometheus pod discovery creates one target per declared container port, so this could duplicate scrapes for CoreDNS pods that expose DNS and metrics ports. Added a keep relabel rule for `__meta_kubernetes_pod_container_port_number` equal to `9153`.
- The RBAC example did not include permission to list/watch EndpointSlices, but the current Prometheus documentation recommends EndpointSlice discovery instead of the deprecated Endpoints API on Kubernetes v1.33 and newer. Added `discovery.k8s.io` `endpointslices` permissions and updated the alternate service discovery snippet to use `role: endpointslice`.
- The metric label transform was described as renaming labels to OpenTelemetry semantic conventions, but `dns.server`, `dns.query.type`, and `network.protocol` are not the current matching semantic convention attributes for this CoreDNS metric. Updated the text and labels to use clearer custom CoreDNS names and the current `network.transport` attribute for TCP/UDP.
- The scaling section said the transform example monitored the number of CoreDNS pods, but the snippet only copies the pod name into another datapoint attribute. Updated the wording to say it preserves the CoreDNS pod name alongside per-pod metrics.

## Review Notes
The corrected main Collector configuration was validated locally with `otel/opentelemetry-collector-contrib:0.153.0 validate`. All YAML snippets in the post parse successfully. `kubectl` is not installed in the local environment, so the Kubernetes commands were reviewed against documented `kubectl` behavior rather than executed against a live cluster.
