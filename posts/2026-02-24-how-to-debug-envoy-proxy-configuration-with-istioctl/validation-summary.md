# Validation Summary: How to Debug Envoy Proxy Configuration with istioctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy Proxy
- istioctl
- Kubernetes
- Service mesh debugging

## Sources Consulted
- Istio command reference for `istioctl proxy-config`, `proxy-status`, and dashboard commands: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic guide, "Debugging Envoy and Istiod": https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio `istioctl` diagnostic tool guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/

## Issues Found
- The post used `istioctl dashboard envoy`, which the current Istio command reference documents as deprecated. Changed it to `istioctl dashboard proxy`, the current replacement for opening the proxy admin dashboard.
- The post showed querying Envoy stats with `curl -s localhost:15000/stats` from the `istio-proxy` container. The current Istio Envoy statistics documentation uses `pilot-agent request GET stats`, which avoids depending on `curl` being present in the proxy container. Updated the command accordingly.

## Review Notes
The `istioctl proxy-config` examples for listeners, routes, clusters, endpoints, full config dumps, and `proxy-status` match the current Istio command reference and diagnostic documentation. The sample output is illustrative and may vary by Istio version, traffic protocol detection, Kubernetes service topology, and mesh configuration.
