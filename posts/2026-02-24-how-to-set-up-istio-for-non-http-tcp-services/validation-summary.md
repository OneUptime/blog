# Validation Summary: How to Set Up Istio for Non-HTTP TCP Services

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio service mesh
- Kubernetes Services
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Istio AuthorizationPolicy
- Istio telemetry and TCP metrics
- istioctl and pilot-agent debugging commands

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio TCP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-tcp/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/

## Issues Found
- The post said TCP-level metrics include connection duration. Istio's standard TCP metrics are bytes sent, bytes received, connections opened, and connections closed; there is no default TCP duration metric listed in the standard metrics reference. Changed the wording to "connections opened/closed."
- The monitoring command queried `pilot-agent request GET stats` and grepped for `tcp\.`. Updated it to query `/stats/prometheus` and grep for `istio_tcp_`, matching Istio's Prometheus metric names for TCP telemetry.

## Review Notes
The remaining YAML examples use current Istio `networking.istio.io/v1` and `security.istio.io/v1` APIs and match the documented fields for TCP routing, gateway servers, destination rules, connection pools, outlier detection, and authorization policy ports/source identity. The gateway service patch remains deployment-specific because the exact ingress gateway Service shape depends on how Istio was installed.
