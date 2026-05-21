# Validation Summary: How to Shift TCP Traffic Between Service Versions in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio TCP traffic routing
- Kubernetes Services and Deployments
- kubectl
- Prometheus metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1`. Istio promoted networking APIs, including VirtualService and DestinationRule, to `networking.istio.io/v1` in Istio 1.22, and current official examples use `v1`. Updated all Istio YAML snippets to use `networking.istio.io/v1`.
- The post said TCP routing can only match on destination port and cannot match on source labels or namespaces. Istio TCP routes use L4 match attributes, which include port, destination subnets, source labels, gateways, and source namespace. Updated the explanation, diagram, and source-match section to reflect the documented behavior and clarify that source labels/namespaces are workload selectors rather than runtime request matches.
- The post said the Service port must start with `tcp-` for Istio to recognize TCP traffic. Istio supports explicit protocol selection through `name: tcp[-suffix]` or Kubernetes `appProtocol: tcp`, and unknown protocols are treated as plain TCP. Updated the wording and example to avoid the inaccurate "must" claim.

## Review Notes
The weighted TCP routing, subset definitions, connection-level routing explanation, DestinationRule TCP connection pool settings, kubectl exec command shape, and Istio TCP Prometheus metric names are consistent with current official documentation.
