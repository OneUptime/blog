# Validation Summary: How to Configure Proxy Protocol in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ingress gateways
- Istio EnvoyFilter
- Envoy PROXY protocol listener filter
- Envoy upstream PROXY protocol transport socket
- AWS Network Load Balancer
- AWS Load Balancer Controller Service annotations
- HAProxy
- curl, ncat, kubectl, and istioctl
- Istio AuthorizationPolicy

## Sources Consulted
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio ingress access control documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy PROXY protocol listener filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/proxy_protocol
- Envoy upstream PROXY protocol transport socket API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/proxy_protocol/v3/upstream_proxy_protocol.proto
- Envoy ProxyProtocolConfig API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/proxy_protocol.proto.html
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- HAProxy PROXY protocol tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- curl HAProxy protocol documentation: https://everything.curl.dev/usingcurl/proxies/haproxy.html
- libcurl CURLOPT_HAPROXYPROTOCOL documentation: https://curl.se/libcurl/c/CURLOPT_HAPROXYPROTOCOL.html

## Issues Found
- The ingress gateway examples used `EnvoyFilter` `applyTo: LISTENER` with `MERGE` to replace listener filters. Replaced this with Istio's documented `gatewayTopology.proxyProtocol` configuration and changed the custom EnvoyFilter example to `applyTo: LISTENER_FILTER` with `INSERT_BEFORE` for `tls_inspector`.
- The EnvoyFilter snippets used `typedConfig` in listener filter examples. Updated the remaining custom EnvoyFilter example to use the documented `typed_config` field.
- The AWS NLB Service example used the older `aws-load-balancer-type: "nlb"` annotation. Updated it to the AWS Load Balancer Controller pattern using `aws-load-balancer-type: "external"` and an explicit NLB target type, and clarified that the PROXY protocol annotation enables PROXY protocol v2.
- The upstream PROXY protocol EnvoyFilter example had an empty `transportSocket` and would not send PROXY protocol. Replaced it with Envoy's `envoy.transport_sockets.upstream_proxy_protocol` wrapper and a raw buffer inner transport socket.
- The testing section said you cannot use `curl` for PROXY protocol. Updated it to mention `curl --haproxy-protocol`, which sends a PROXY protocol v1 header, while keeping the manual `ncat` example.
- The AuthorizationPolicy discussion did not mention Istio's documented interaction between PROXY protocol, `X-Forwarded-For`, and `numTrustedProxies`. Added the caveat that XFF trusted client address calculation takes precedence when configured.

## Review Notes
The post is now technically accurate for current Istio and Envoy documentation. One future improvement would be to separate HTTP ingress use cases from pure TCP forwarding use cases more explicitly, because Istio's PROXY protocol guidance is especially careful about L4 load balancers and trusted client address configuration.
