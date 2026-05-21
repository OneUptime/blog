# Validation Summary: How to Integrate Istio with Prometheus for Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus
- Kubernetes
- Prometheus Operator
- PromQL
- Istio Telemetry API
- Envoy sidecar metrics

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio application requirements and sidecar/control-plane ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio upgrade notes for Telemetry API metric customization replacing older IstioOperator metric customization: https://istio.io/latest/docs/ops/common-problems/upgrade-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio release-1.29 Prometheus sample addon manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/prometheus.yaml
- Istio release-1.29 Prometheus Operator sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/extras/prometheus-operator.yaml

## Issues Found
- The quick-start Prometheus addon command used the old `release-1.20` manifest. Updated it to `release-1.29`, matching Istio's current Prometheus integration documentation.
- The Prometheus pod verification command used `-l app=prometheus`, but the current sample addon labels Prometheus with `app.kubernetes.io/name=prometheus` and `app.kubernetes.io/component=server`. Updated the selector accordingly.
- The custom `envoy-stats` scrape configuration selected the `istio-proxy` container and rewrote addresses with a hard-coded `15090` replacement that depended on an annotation port being present. Replaced this with Istio's documented container port-name match for ports ending in `-envoy-prom`.
- The Prometheus Operator example did not match Istio's current sample PodMonitor and ServiceMonitor resources. Updated the selector, namespace selector, relabeling rules, and labels to match the official Istio operator sample.
- The cardinality reduction section showed `extraStatTags: []` as a way to remove labels. That field controls extra telemetry tags and does not remove existing metric labels. Replaced it with a Telemetry API `tagOverrides` example using `operation: REMOVE`.
- The verification section implied that all setups would show `envoy-stats` and `istiod` targets. Clarified that those target names apply when using the custom scrape configuration shown in the post.

## Review Notes
The remaining metric names, PromQL examples, Istio sidecar/control-plane ports, Telemetry API examples, and `istioctl dashboard prometheus` command are consistent with the official Istio documentation reviewed. The sample addon remains appropriate for testing only, as stated in the post.
