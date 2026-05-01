# Validation Summary: How to Configure Envoy IP Transparency to Preserve Client IPv4 Addresses

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Envoy Proxy
- X-Forwarded-For (XFF)
- HAProxy PROXY protocol
- HTTP proxying
- TCP proxying
- IPv4 client address propagation

## Sources Consulted
- Envoy documentation, "IP Transparency": https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/ip_transparency
- Envoy documentation, "HTTP header manipulation" (`x-forwarded-for`): https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html#x-forwarded-for
- Envoy v3 API, `HttpConnectionManager`: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy documentation, "Proxy Protocol" listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/proxy_protocol
- Envoy v3 API, "Upstream Proxy Protocol" transport socket: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/proxy_protocol/v3/upstream_proxy_protocol.proto
- Envoy v3 API, `config.core.v3.ProxyProtocolConfig`: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/proxy_protocol.proto.html
- HAProxy PROXY protocol specification: https://www.haproxy.org/download/2.1/doc/proxy-protocol.txt

## Issues Found
- The introduction overstated the behavior by implying all methods make the backend literally see the client IP on the connection. I corrected that wording so it distinguishes between Envoy's source IP on the connection and propagation of client IP metadata.
- The "PROXY Protocol to Upstream" cluster example used the wrong Envoy API. It incorrectly configured `upstream_proxy_protocol_config` under HTTP protocol options and used an invalid transport socket name. I replaced it with the documented `envoy.transport_sockets.upstream_proxy_protocol` transport socket and the correct `ProxyProtocolUpstreamTransport` wrapper around `raw_buffer`.
- The section "Accepting PROXY Protocol from Upstream" used Envoy's upstream/downstream terminology incorrectly for a load balancer that is sending traffic into Envoy. I corrected the heading and explanatory sentence to refer to a downstream/fronting load balancer.
- The verification section reused port `8080` for both Envoy and the debug backend, which would conflict in a real test. I moved the sample backend to `8081` and clarified that `backend_cluster` should point to `127.0.0.1:8081` when testing locally.
- The verification command depended on header capitalization when reading the echoed JSON. I normalized header names to lowercase in the Python example and updated the `jq` expression accordingly so the verification works reliably.
- The conclusion described XFF and PROXY protocol as "IP transparency" in a way that blurred metadata forwarding with transport-layer source preservation. I tightened the wording to describe client IPv4 preservation more precisely.

## Review Notes
- Envoy's documentation warns that using the PROXY protocol transport socket toward HTTP upstreams reduces or eliminates normal upstream connection reuse because PROXY protocol is connection-based. The post's final recommendation to prefer XFF for HTTP workloads is consistent with that caveat.
- The post is now technically accurate for current Envoy v3 configuration, but readers should still align `xff_num_trusted_hops` with their real proxy chain rather than copying `0` blindly.
