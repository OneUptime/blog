# Validation Summary: Preserve Client IPs in Contour with PROXY Protocol and Trusted Hops

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- Contour 1.33 and HTTPProxy IP filtering
- Envoy listeners, access logs, and forwarded client addresses
- Kubernetes LoadBalancer and NodePort Services, kube-proxy, and external traffic policy
- PROXY protocol v1/v2, HTTP forwarding headers, layer 4 load balancers, and CDNs
- YAML and curl

## Sources Consulted
- Contour 1.33 PROXY protocol guide: https://projectcontour.io/docs/1.33/guides/proxy-proto/
- Contour 1.33 configuration reference (serve flags and network configuration): https://projectcontour.io/docs/1.33/configuration/
- Contour 1.33 IP filtering: https://projectcontour.io/docs/1.33/config/ip-filtering/
- Contour 1.33 API reference: https://projectcontour.io/docs/1.33/config/api/
- Contour 1.33 health checking: https://projectcontour.io/docs/1.33/guides/health-checking/
- Contour v1.33.0 listener implementation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/envoy/v3/listener.go
- Kubernetes source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes traffic policies and terminating endpoints: https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-to-terminating-endpoints
- Envoy X-Forwarded-For and external address handling: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers#x-forwarded-for
- Envoy PROXY protocol listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/proxy_protocol
- HAProxy PROXY protocol specification: https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt
- curl official manual, --fail and --header: https://curl.se/docs/manpage.html

## Issues Found
1. **Incomplete Service example:** The YAML omitted ports and a selector while resembling a complete Service manifest. Labeled it explicitly as a fragment to merge into the existing Service, retaining those fields. This avoids presenting it as a standalone deployment.
2. **Terminating endpoint exception:** The statement that nodes without ready local endpoints never forward traffic omitted graceful draining. Changed it to nodes without local endpoints and explained the ProxyTerminatingEndpoints exception, stable since Kubernetes 1.28.
3. **PROXY listener scope and health checks:** “All Envoy listening ports” was too broad. Scoped the setting to Contour-managed ingress listeners and clarified that separate health/admin listeners are not covered; raw HTTP/TLS health checks fail when sent to a PROXY-enabled ingress listener.
4. **XFF behavior and hop counting:** Not every CDN automatically appends XFF. Qualified the statement and tied the one-hop setting to a verified rightmost client-address entry. Clarified that an intervening layer 4 load balancer does not add an HTTP forwarding hop.
5. **Authentication terminology:** Replaced the success criterion's “authenticated client” with “validated client address” and clarified that an IP address alone does not authenticate a user.

## Review Notes
- Verified serve, --incluster, --use-proxy-protocol, and network.num-trusted-hops against the versioned Contour documentation. The v1.33.0 implementation sets use_remote_address=true and passes the configured trusted-hop count to Envoy.
- Confirmed that Peer selects the physical connection peer and Remote can reflect PROXY protocol or trusted XFF. PROXY metadata requires a trusted sender; the protocol provides no sender authentication.
- The native GKE source-preservation claim matches the cited Contour guide, subject to the Kubernetes and provider topology caveats already in the post.
- The curl options and shell quoting are valid. The example hostname is a placeholder requiring a deployed endpoint; no external spoofing tests were run.
- The cited technical documentation URLs resolve to the intended resources. Envoy's latest documentation is a moving development reference; Contour-specific configuration was also checked against version 1.33 documentation and source.
- This was a documentation and static review, not an end-to-end deployment test. Provider-specific health checks, IPv6 behavior, rollout availability, and application proxy middleware require validation in the actual environment.
