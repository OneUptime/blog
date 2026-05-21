# Validation Summary: How to Monitor Istio Resource Consumption

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Envoy

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl/control-plane metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Sidecar resource documentation: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Kubernetes kubectl top command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described ingress and egress gateways as control-plane components. Istio's control plane is istiod; gateways are Envoy data-plane proxies. Updated the categorization and summary to reflect this.
- The all-namespace `kubectl top pods -A --containers` aggregation used the wrong columns for output that includes namespace, pod, container, CPU, and memory. Replaced it with an awk command that filters the `istio-proxy` container column and handles common CPU and memory units.
- The connected sidecars query used `pilot_xds_connected_clients`, which is not the current documented Istio metric. Replaced it with `pilot_xds`.
- The Grafana and Prometheus addon URLs pointed at Istio `release-1.22`. Updated them to the current documented `release-1.30` addon paths.
- The memory-limit percentage queries divided container usage by limit metrics without explicit PromQL vector matching and did not exclude containers without memory limits. Added `on(namespace, pod, container)` matching and filtered zero limits in the percentage query and related alerts.

## Review Notes
The Istio sample addon manifests are intended for demonstration and short-term/small-cluster monitoring, not hardened production monitoring. The post's overall approach is technically valid, but production deployments should use a properly managed Prometheus and Grafana setup.
