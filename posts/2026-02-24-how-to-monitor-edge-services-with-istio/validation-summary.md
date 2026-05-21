# Validation Summary: How to Monitor Edge Services with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar telemetry
- Istio Telemetry API
- IstioOperator mesh configuration
- Prometheus scraping, alert rules, and remote write
- Kubernetes Deployments, ConfigMaps, and volumes
- Kiali
- istioctl and pilot-agent diagnostics

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The `istiod` scrape configuration used pod discovery and rewrote `__address__` from only the `prometheus.io/port` annotation, which could produce an invalid target such as `15014:15014`. Changed it to the Istio-documented `endpoints` discovery pattern that keeps the `istiod;http-monitoring` endpoint.
- The Prometheus alert rules ConfigMap was shown, but Prometheus was not configured to load rule files and the Deployment did not mount the alert ConfigMap. Added `rule_files` and mounted `prometheus-alerts` at `/etc/prometheus/rules`, with `optional: true` so the Deployment can start before the alert ConfigMap exists.
- The `SidecarNotReady` alert name did not match the metric being queried. The query uses `pilot_proxy_convergence_time_bucket`, which measures proxy convergence delay, so the alert was renamed to `SlowProxyConvergence`.
- The Kiali quick-start command referenced the older Istio `release-1.22` sample manifest. Updated it to the current Istio documentation's `release-1.30` sample URL.

## Review Notes
- The YAML snippets parse successfully.
- The Prometheus image uses `prom/prometheus:latest`; pinning an explicit version would be better for reproducible production deployments, but it is not technically incorrect for the tutorial.
- Direct scraping of sidecar telemetry ports is cleartext by default. Istio documents secure scraping patterns for environments that require mTLS-protected metric collection.
