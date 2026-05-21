# Validation Summary: How to Handle Mixed Protocol Services in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio protocol selection
- Kubernetes Services and Service port naming
- Kubernetes `appProtocol`
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy HTTP connection manager and WebSocket upgrades
- `istioctl proxy-config`

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service protocol and `appProtocol` documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html
- Envoy HTTP connection manager reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html

## Issues Found
- The `appProtocol` section omitted the precedence rule when both `appProtocol` and a protocol-prefixed port name are set. Added a sentence stating that Istio uses `appProtocol`, matching Istio's protocol selection documentation.
- The `istioctl proxy-config` examples used `deploy/multi-protocol-service`. Updated them to `deployment/multi-protocol-service`, which matches the workload reference form shown in the official `istioctl` command documentation.
- The auto-detection example included an `annotations:` field containing only a comment. Removed it because Istio does not use a Service annotation to disable protocol detection in this example, and an empty/null annotations field is not a valid Kubernetes metadata annotations map.

## Review Notes
The remaining examples use current Istio networking API fields and valid protocol-selection patterns. The EnvoyFilter example is technically valid but should be treated cautiously in production because Istio documents EnvoyFilter as tightly coupled to generated Envoy configuration and upgrade-sensitive.
