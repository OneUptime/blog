# Validation Summary: Route Raw TCP and TLS Passthrough with Contour TCPProxy

## Status

validated

## Post Type

Technical guide with Kubernetes configuration and connection diagnostics.

## Technologies Covered

- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy TCP proxying, TLS termination, TLS passthrough, and SNI
- Kubernetes Services, EndpointSlices, NetworkPolicy, TLS Secrets, and kubectl
- Gateway API TCPRoute and dynamic Gateway provisioning
- OpenSSL s_client
- MQTT and PostgreSQL connection protocols

## Sources Consulted

- Contour 1.33 TLS session proxying, passthrough, and Secret requirements: https://projectcontour.io/docs/1.33/config/tls-termination/#tls-session-proxying
- Contour 1.33 HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour 1.33 TCP health checks: https://projectcontour.io/docs/1.33/config/health-checks/
- Contour 1.33 Gateway API implementation and listener provisioning: https://projectcontour.io/docs/1.33/config/gateway-api/
- Contour downstream PROXY protocol configuration: https://projectcontour.io/docs/1.33/guides/proxy-proto/
- Gateway API TCPRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/tcproute/
- Gateway API v1.3.0 experimental TCPRoute CRD: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.3.0/config/crd/experimental/gateway.networking.k8s.io_tcproutes.yaml
- Envoy TCP proxy connection and cluster selection: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/tcp_proxy_filter
- PostgreSQL SSL negotiation message flow: https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-SSL
- PostgreSQL 17 sslnegotiation connection option: https://www.postgresql.org/docs/17/libpq-connect.html#LIBPQ-CONNECT-SSLNEGOTIATION
- OpenSSL s_client options: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Kubernetes Services and port mapping: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice Service association: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes NetworkPolicy behavior: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl get flags: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl JSONPath syntax: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found

1. **Incomplete TLS Secret requirement.** The post described the Secret as a certificate. Corrected this to require a `kubernetes.io/tls` Secret containing `tls.crt` and the matching `tls.key`, as required for Envoy to terminate TLS.
2. **Overbroad PostgreSQL negotiation claim.** The post implied PostgreSQL always sends a negotiation message before its ClientHello. Restricted this statement to default SSL negotiation and noted PostgreSQL 17's `sslnegotiation=direct` option. Clarified that an initial SSLRequest prevents SNI routing in both termination and passthrough modes. This does not assert that selecting direct negotiation alone completes a working PostgreSQL deployment.
3. **Ambiguous source IP preservation.** The original wording could imply that load balancer settings or `externalTrafficPolicy` preserve the client source IP through Envoy to the backend. Explained that Envoy creates a separate backend connection and that downstream address preservation or PROXY protocol determines the address Envoy sees, without automatically transmitting that address to the backend.

## Review Notes

- Confirmed the API version, resource kind, virtual host TLS alternatives, backend ports and weights, all four TCP health-check fields, route precedence, and singular `tcpproxy.include`. The deprecated plural field is correctly described as a compatibility feature; none of the examples uses it.
- Confirmed SNI-based selection, direct TLS requirements, encrypted passthrough, cleartext upstream behavior for the shown termination configuration, and the absence of HTTP processing on these TCP streams.
- Confirmed that weighted selection applies to connections and that connect-only health checks do not validate application operations.
- Confirmed TCPRoute listener-based routing and Contour's dynamic synchronization of Envoy listener and Service ports. The experimental-channel statement is explicitly scoped to the versions used with Contour 1.33. The current TCPRoute reference now describes Standard Channel availability since Gateway API v1.6.0; readers using newer versions should consult their matching release documentation.
- All six documentation links in the post were retrieved successfully. The Gateway API page required direct HTTP retrieval after the browsing tool returned an internal error.
- Parsed all three YAML blocks successfully with PyYAML and checked all three shell blocks with `bash -n`. Checked kubectl flags, JSONPath newline syntax, EndpointSlice selectors, and OpenSSL connection, SNI, brief-output, and certificate-display options against official documentation.
- The weighted-services block is a configuration fragment. The two complete HTTPProxy examples represent alternative deployments for the same hostname and should not be installed together. Existing namespace, Services, endpoints, and the termination Secret are prerequisites.
- `ENVOY_ADDRESS` is a placeholder. The OpenSSL commands inspect TLS connectivity and presented certificates; they do not perform an MQTT operation or enforce hostname verification. Certificate comparison distinguishes modes only when the backend and edge certificates differ.
- Validation was a documentation and static syntax review. No live cluster, TLS endpoint, or application workload was supplied, so runtime connectivity, certificate contents, readiness, and application operations were not tested.
