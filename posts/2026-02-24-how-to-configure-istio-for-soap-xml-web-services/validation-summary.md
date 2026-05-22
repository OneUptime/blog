# Validation Summary: How to Configure Istio for SOAP/XML Web Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService, DestinationRule, Gateway, EnvoyFilter, and AuthorizationPolicy
- Kubernetes Deployments, Services, namespaces, labels, and readiness probes
- SOAP 1.1 and SOAP 1.2 over HTTP
- Envoy HTTP buffer filter
- Prometheus promtool and Istio standard metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy HTTP buffer filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- W3C SOAP 1.1 specification: https://www.w3.org/TR/2000/NOTE-SOAP-20000508/
- W3C SOAP 1.2 Part 2 Adjuncts: https://www.w3.org/TR/soap12-part2/

## Issues Found
- The post stated that all SOAP requests use HTTP POST. SOAP 1.1's HTTP binding defines SOAP over POST, but SOAP metadata such as WSDL is commonly fetched with GET and SOAP 1.2 has HTTP binding behavior involving POST and GET. Updated the wording to avoid the absolute claim.
- The post stated that SOAP traffic cannot use path-based routing because all requests go to the same URL path. Many SOAP services behave this way, but it is not universal. Updated the wording to say header-based routing is often needed.
- The Istio `VirtualService` examples used `networking.istio.io/v1beta1`. Updated current Istio networking examples to `networking.istio.io/v1`.
- The Istio `AuthorizationPolicy` example used `security.istio.io/v1beta1`. Updated it to `security.istio.io/v1`.
- The `VirtualService` header match used `SOAPAction` as the header key. Istio requires HTTP header match keys to be lowercase, so this was changed to `soapaction` and explained in the text.
- The WSDL example was a separate `VirtualService` for the same mesh host, which can conflict with the earlier `VirtualService`. Changed it to a route fragment and clarified that it should be added before the POST matches in the same `VirtualService`.
- The large XML payload example changed only `max_request_headers_kb`, which affects request headers rather than the SOAP body. Replaced it with an Envoy HTTP buffer filter example using `max_request_bytes`.
- The `promtool query instant` commands omitted the required Prometheus server argument. Added `http://localhost:9090` to both examples.

## Review Notes
The Envoy buffer filter example is technically valid, but buffering full SOAP request bodies increases proxy memory pressure and should be sized carefully for production workloads. `kubectl` was not installed in the local environment, so command syntax was checked against documentation rather than local CLI help.
