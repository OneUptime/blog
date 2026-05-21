# Validation Summary: How to Set Up Protocol Sniffing in Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio protocol selection and automatic protocol detection
- Envoy sidecar proxy and HTTP inspector
- Kubernetes Services and health probes
- Istio `Sidecar` and `DestinationRule` resources
- `istioctl proxy-config` diagnostics

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Application Requirements / Server First Protocols: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Ingress Sidecar TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sidecar-tls-termination/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP Inspector documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/http_inspector
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The protocol detection order said Istio checks the Service port name before `appProtocol`. Istio documentation says `appProtocol` takes precedence when both are defined. Updated the detection order.
- The introduction and protocol-detection steps only described HTTP/1.x method matching. Istio automatic protocol selection detects HTTP and HTTP/2, so the text now mentions HTTP/2 and the HTTP/2 connection preface.
- The server-first protocol example used `name: mysql`. Istio documents server-first protocols as incompatible with automatic protocol selection and recommends declaring them as TCP; `mysql` is experimental protocol support. Updated the example to use `tcp-mysql`.
- The TLS section suggested using a `DestinationRule` with `ISTIO_MUTUAL` to make the sidecar terminate TLS for HTTP features. `DestinationRule` controls outbound TLS origination, not inbound sidecar TLS termination. Replaced it with a `Sidecar` ingress TLS termination example.
- The Envoy stats command looked for `http.inbound` and described it as protocol detection evidence. Envoy exposes HTTP inspector counters such as `http11_found`, `http2_found`, and `http_not_found`, so the command and explanation were updated to use `http_inspector` stats.
- The health-check section said Kubernetes health probes go through the sidecar and tied TCP health checks to sniffing of later real traffic. Istio rewrites HTTP, TCP, and gRPC probes by default so the sidecar agent handles them separately from normal protocol sniffing. Updated the explanation.

## Review Notes
The examples are intentionally generic and assume a sidecar-based Istio deployment. Gateway behavior differs from sidecar behavior for protocol selection, especially for TLS and HTTP/2 forwarding.
