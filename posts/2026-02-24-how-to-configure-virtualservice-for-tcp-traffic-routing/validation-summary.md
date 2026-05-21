# Validation Summary: How to Configure VirtualService for TCP Traffic Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- TCP traffic routing
- Kubernetes Services
- istioctl debugging commands

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio TCP Traffic Shifting task: https://istio.io/latest/docs/tasks/traffic-management/tcp-traffic-shifting/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- The TCP vs HTTP feature table said TCP routing supports timeouts in the same way as HTTP routing. Istio VirtualService TCPRoute does not define a route timeout field; TCP connection and idle timeouts are configured through DestinationRule connection pool settings. Changed the table row from "Timeout" to "Route timeout" and marked TCP as "No".
- The examples used `networking.istio.io/v1beta1`. Istio networking APIs were promoted to stable `networking.istio.io/v1` in Istio 1.22, and current official docs use `v1`. Updated all Istio VirtualService, DestinationRule, and Gateway snippets to `networking.istio.io/v1`.
- The circuit breaking explanation described `interval: 30s` as if all 5 errors must happen "within 30 seconds." Istio's outlier detection interval is the ejection sweep interval, not a rolling error window. Updated the explanation to say endpoints are eligible for ejection after 5 consecutive TCP connection failures or timeouts, with ejection starting at the configured `baseEjectionTime`.

## Review Notes
The source label example is technically valid for mesh traffic, but `sourceLabels` is a workload selector used when generating configuration rather than a runtime TCP payload match. The post's wording is acceptable for an introductory guide, but a future revision could call out that distinction explicitly.
