# Validation Summary: How to Implement Request Shadowing for Testing in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Prometheus / Istio telemetry
- Python

## Sources Consulted
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule examples in VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Envoy route mirroring documentation: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/route-mirror.html
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The Istio `DestinationRule` and `VirtualService` snippets used `apiVersion: networking.istio.io/v1beta1`. The current Istio documentation uses `networking.istio.io/v1` for these resources, so the examples were updated to the current stable API version.

## Review Notes
The mirroring behavior described in the post matches Istio and Envoy documentation: mirrored traffic is sent out of band, the primary response is returned to the client, mirror responses are discarded, and mirrored requests have `-shadow` appended to the Host/Authority header. The `mirror`, `mirrorPercentage.value`, Kubernetes Service and Deployment snippets, label selector usage in `kubectl logs`, and `istio_requests_total` monitoring guidance are technically valid.
