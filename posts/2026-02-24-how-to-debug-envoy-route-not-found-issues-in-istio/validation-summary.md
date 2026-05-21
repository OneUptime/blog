# Validation Summary: How to Debug Envoy Route Not Found Issues in Istio

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes Services
- Istio VirtualService
- Istio Gateway
- Istio Sidecar
- istioctl
- kubectl
- curl

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio VirtualServiceHostNotFoundInGateway analyzer reference: https://istio.io/latest/docs/reference/config/analysis/ist0132/
- Istio VirtualServiceDestinationPortSelectorRequired analyzer reference: https://istio.io/latest/docs/reference/config/analysis/ist0112/
- Envoy access log formatter response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Envoy response code details documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details
- Envoy route-not-found debugging FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/debugging/why_is_my_route_not_found

## Issues Found
- Updated Istio configuration snippets from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used in current Istio documentation.
- Corrected the wrong-port explanation. A VirtualService destination port must select the Kubernetes Service port, but a wrong destination port is more accurately an upstream cluster or destination selection problem, not necessarily a route-match failure.
- Corrected the Service port naming section. Current Istio can automatically detect HTTP and HTTP/2 traffic, and protocol selection can be explicit through either Service port names or `appProtocol`. The post previously implied that unrecognized or missing port names are always treated as TCP.
- Added `grpc-web` to the list of Istio-recognized protocol names and noted that `appProtocol` takes precedence over the port name when both are set.

## Review Notes
The remaining debugging flow, including checking Envoy `NR` response flags, `route_not_found` response details, Gateway and VirtualService host matching, Sidecar egress host restrictions, `istioctl proxy-config` inspection, and `istioctl analyze`, is consistent with current official documentation. Future improvements could mention the Envoy host-with-port matching pitfall documented by Envoy, but the existing Host header section is technically correct.
