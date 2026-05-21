# Validation Summary: How to Debug Data Plane Configuration Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- istioctl
- kubectl
- YAML configuration

## Sources Consulted
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Diagnose your Configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PortNameIsNotUnderNamingConvention analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0118/
- Istio Envoy Access Logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio NamespaceNotInjected analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0102/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html

## Issues Found
- The explanation of `NOT SENT` in `istioctl proxy-status` implied it could indicate startup or registration problems. Istio documents `NOT SENT` as meaning istiod has not sent anything, usually because there is nothing to send for that resource type. Updated the wording to match the official explanation.
- The istiod debug endpoint example used `/debug/configz` without identifying the proxy. For comparing istiod's generated proxy config with the sidecar's loaded config, the proxy-specific `/debug/config_dump?proxyID=...` endpoint is the appropriate form. Updated the command to use `config_dump` with a sample proxy ID.
- The port naming section stated that a nonconforming port name is treated as plain TCP. Istio documentation says nonconforming names trigger protocol detection, while explicit protocol selection uses `name: <protocol>[-<suffix>]` or `appProtocol`. Updated the wording to describe protocol detection and recommend explicit protocol naming for HTTP-level features.

## Review Notes
The examples use sidecar-mode Istio debugging workflows. In environments using revision-based injection, the namespace may use an `istio.io/rev` label instead of `istio-injection=enabled`, but the documented command remains valid for default injection.
