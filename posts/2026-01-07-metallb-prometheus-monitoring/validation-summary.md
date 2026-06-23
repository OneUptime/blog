# Validation Summary: How to Monitor MetalLB with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- PromQL

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB Layer 2 concepts documentation: https://metallb.universe.tf/concepts/layer2/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB upstream v0.15.2 manifests: https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml
- MetalLB upstream source and metric definitions: https://github.com/metallb/metallb
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/

## Issues Found
- The post described the IPAddressPool and L2Advertisement example as a ConfigMap. Updated the surrounding text and YAML comment to correctly call them MetalLB custom resources.
- The post listed and queried `metallb_bgp_opens_sent` as a native MetalLB BGP metric. Current MetalLB native BGP metrics include session state, updates, and announced prefixes; `opens_sent` is available under the FRR-K8s metric prefix. Removed the native `metallb_bgp_opens_sent` references from the metric list and Grafana dashboard query.
- The post did not distinguish native BGP metrics from default FRR-K8s metrics. Added a short note that FRR-K8s deployments use `frrk8s_bgp_*` metric names or require Prometheus relabeling.
- Some PromQL alerts combined labeled vectors with an unlabeled aggregate using `and`, which would not match as intended. Updated the BGP no-prefix and Layer 2 no-activity alerts to aggregate both sides appropriately.
- The Kubernetes API error-rate queries divided by the raw update rate, which can produce invalid or misleading values when the update rate is zero. Wrapped the denominator with `clamp_min(..., 1)`.
- Component health alerts used `up{job="metallb-controller"}` and `up{job="metallb-speaker"}`, but the ServiceMonitor examples in the post do not guarantee those `job` label values. Updated the alerts to use the namespace and service labels created by the shown Services, and added `absent()` handling for the controller target.

## Review Notes
The Service and ServiceMonitor examples match the labels and metrics port exposed by current upstream MetalLB manifests. The BGP dashboard and alert examples now target native BGP metrics; FRR-K8s users should follow the added note and adjust metric names or relabeling.
