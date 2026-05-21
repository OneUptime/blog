# Validation Summary: How to Configure Prometheus Federation for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus
- Prometheus federation
- Prometheus Operator ServiceMonitor and PodMonitor resources
- Kubernetes Services
- Istio VirtualService
- PromQL

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Istio 1.6 change notes for Galley removal: https://preliminary.istio.io/latest/news/releases/1.6.x/announcing-1.6/change-notes/

## Issues Found
- The Istio Prometheus sample install command used `release-1.20`, which is no longer current. Updated it to `release-1.30`, matching the current Istio documentation.
- The central Prometheus federation example selected `galley_.*` metrics. Galley was removed from Istio years ago, so this is not correct for current Istio. Removed that matcher.
- The label-conflict section implied that a local `cluster` label simply conflicts with the `static_configs` label. With `honor_labels: true`, Prometheus preserves scraped labels and renames conflicting target labels with the `exported_` prefix. Updated the explanation while keeping the relabeling fix.

## Review Notes
- The Istio sample Prometheus manifest is intended for demonstration and short-retention use, not production-scale monitoring.
- The ServiceMonitor and PodMonitor snippets are structurally valid Prometheus Operator resources, but real deployments must ensure the Prometheus custom resource selects those monitors and the relevant namespaces.
- The Istio Gateway example assumes an existing Gateway named `mesh-gateway`; production use should also add authentication and network controls before exposing Prometheus.
