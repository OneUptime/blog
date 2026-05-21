# Validation Summary: How to Handle Source IP Preservation with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar traffic interception
- Envoy proxy headers and PROXY protocol
- Kubernetes Services and `externalTrafficPolicy`
- Linux iptables REDIRECT and TPROXY
- Kubernetes `kubectl` commands

## Sources Consulted
- Istio Global Mesh Options, `InboundInterceptionMode`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations, `sidecar.istio.io/interceptionMode`: https://istio.io/latest/docs/reference/config/annotations/
- Istio Configuring Gateway Network Topology: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio CNI installation and sidecar redirection notes: https://istio.io/latest/docs/setup/additional-setup/cni/
- Kubernetes Create an External Load Balancer, preserving client source IP: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes Using Source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Envoy HTTP header manipulation, `X-Forwarded-For`: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html

## Issues Found
- Corrected the REDIRECT explanation. The post said iptables REDIRECT rewrites the connection source address to localhost. REDIRECT changes the destination to the proxy listener; the application sees a loopback source because Envoy opens a separate upstream connection to the application.
- Replaced the claim that Envoy automatically adds `X-Forwarded-For` and `X-Real-IP` headers with Istio-specific wording about gateway-managed `X-Forwarded-For` and `X-Envoy-External-Address`.
- Replaced `X-Envoy-Peer-Metadata` as a source-IP mechanism with `X-Envoy-External-Address`, which is the relevant Istio ingress header for trusted client address handling.
- Corrected the `numTrustedProxies` explanation. The value represents trusted proxies in front of the Istio ingress gateway, not the ingress gateway plus sidecar hops.
- Replaced the hand-written PROXY protocol `EnvoyFilter` example with Istio's documented `gatewayTopology.proxyProtocol` configuration and added the documented TCP/L7 caveat.
- Clarified that TPROXY iptables and routing setup may be done by either the injected init container or Istio CNI.

## Review Notes
The post is technically relevant and contains implementation details. The remaining examples are version-general and match current Istio and Kubernetes documentation, but behavior can still depend on the cloud load balancer implementation and whether Istio CNI is enabled.
