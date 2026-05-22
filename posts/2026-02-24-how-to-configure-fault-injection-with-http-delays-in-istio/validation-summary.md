# Validation Summary: How to Configure Fault Injection with HTTP Delays in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- VirtualService
- HTTP fault injection
- Envoy sidecar proxies
- Prometheus metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The VirtualService examples used `apiVersion: networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API used by Istio's current official documentation.
- The timeout example combined `fault` and `timeout` in the same HTTP route and claimed the route-level timeout would produce a 504 after 3 seconds. Istio's VirtualService reference states that timeouts and retries are not enabled when client-side faults are enabled on the same route. Updated the section to test injected delays against application-level timeouts or a separate route without fault injection.
- The access log example implied access logs are always available and used a JSON-style `duration` field. Istio documents that access logging must be enabled and the default format uses `%DURATION%`. Updated the wording and example accordingly.

## Review Notes
The remaining VirtualService delay examples, match conditions, percentage fields, `fixedDelay` duration values, `kubectl apply`, `kubectl exec`, and `kubectl logs` usage are consistent with the official Istio and Kubernetes command patterns reviewed.
