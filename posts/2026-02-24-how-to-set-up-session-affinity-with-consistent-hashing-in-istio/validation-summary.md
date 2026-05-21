# Validation Summary: How to Set Up Session Affinity with Consistent Hashing in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- DestinationRule
- VirtualService
- Consistent hash load balancing
- kubectl
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Traffic Management Best Practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy load balancing overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers.html
- Envoy RouteAction hash policy reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The introduction said Envoy ensures all requests with the same key go to the same pod. Istio documents consistent hash as soft session affinity that can change when endpoints are added or removed, so the wording was changed to clarify the guarantee only holds while the endpoint set stays stable.
- The header-based affinity section said missing headers hash as an empty key. Envoy's hash policy documentation says no hash is produced when the configured header is absent, so the text was corrected to say Envoy falls back to normal load balancing.
- The source-IP ingress explanation said external traffic might appear to come from the gateway's IP. The more accurate caveat is that the source IP may be a shared NAT or external load balancer IP unless client IP preservation is configured, so the wording was updated.
- The full working example used a stock nginx deployment, which would not show which pod handled each request. The container command now writes the pod hostname to the nginx index page so the affinity test has observable output.
- The cookie test used a manually invented cookie value after telling the reader to note the generated cookie. The commands now use curl's cookie jar with `-c cookies.txt` and `-b cookies.txt` to test the actual Envoy-generated cookie.
- The monitoring section implied `istioctl proxy-config endpoint` shows traffic distribution. That command shows endpoint configuration and health, not per-endpoint traffic volume, so the text now points readers to access logs or Istio metrics for distribution.

## Review Notes
The Istio `networking.istio.io/v1` API version and the `DestinationRule` fields used in the examples are current in the Istio 1.30 documentation. Short service names work when the rule is in the service namespace, but fully qualified service names remain safer for multi-namespace examples.
