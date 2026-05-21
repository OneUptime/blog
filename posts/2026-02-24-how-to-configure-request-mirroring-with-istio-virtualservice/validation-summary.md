# Validation Summary: How to Configure Request Mirroring with Istio VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio request mirroring / traffic shadowing
- Envoy request mirroring
- Kubernetes kubectl
- istioctl
- Prometheus / Istio standard metrics

## Sources Consulted
- Istio Mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio secure metrics task: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Envoy route request mirror policy reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy route mirroring sandbox: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/route-mirror.html

## Issues Found
- Updated all Istio configuration snippets from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used by the official Istio documentation.
- Clarified the mirrored request copy description. The original text said the mirrored request had the same headers, then later noted that the Host header changes. Updated it to state that Host/Authority is the exception because Envoy appends `-shadow`.
- Replaced the absolute "zero impact" claim with the more precise official behavior: Envoy does not wait for mirrored responses before returning the primary response.
- Clarified timeout wording so it does not imply Envoy waits for mirrored responses. Mirrored requests are still upstream requests governed by proxy limits and timeouts, but their responses are not returned to the client.
- Updated the `istioctl proxy-config routes` example from `deploy/my-app-v1` to the officially documented `deployment/my-app-v1` resource form.
- Updated the test `curl` command to run from an in-cluster curl deployment so Kubernetes cluster DNS resolution works as shown.
- Replaced the final "without any risk to your users" phrasing with a technically accurate statement that mirrored responses are not exposed to users.

## Review Notes
The mirroring configuration fields `mirror` and `mirrorPercentage.value` are valid for Istio `VirtualService`, and the Prometheus metric name and `destination_version` label are documented Istio standard metrics. The examples assume the referenced services, subsets, workloads, labels, and a curl deployment already exist.
