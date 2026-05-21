# Validation Summary: How to Set Up Istio for Event Sourcing Pattern

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio AuthorizationPolicy
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes HorizontalPodAutoscaler
- Prometheus metrics for Istio
- Event sourcing architecture

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The event stream VirtualService rule appeared after the broader `GET /api/orders` rule. Istio applies the first matching HTTP route, so `GET /api/orders/events` would have been routed to `order-queries` instead of `event-store`. Moved the event stream rule before the broader command/query rules.
- The Istio networking snippets used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for VirtualService and DestinationRule examples, so the snippets were updated to the current API version.
- The CPU-based HPA examples scaled workloads whose Deployment snippets did not define CPU requests. Kubernetes CPU utilization HPAs depend on resource requests, so CPU and memory requests were added to the command and query handler containers and a short note was added before the HPA examples.

## Review Notes
- The YAML snippets parse successfully after the edits.
- The AuthorizationPolicy is syntactically valid and uses current `security.istio.io/v1`. Its second rule allows any source to access `/health` and `/metrics`; that matches the surrounding text's intent to keep those endpoints reachable, but production deployments may want to narrow metrics access further.
- The Prometheus examples use the documented `istio_requests_total` metric and `destination_service` / `response_code` labels. Projection lag should still come from the event platform, as the post states.
