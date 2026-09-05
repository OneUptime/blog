# Validation Summary: Envoy Gateway Returns `NR filter_chain_not_found` Behind HAProxy: Preserve SNI and Listener Matching

## Status
validated

## Post Type
Technical troubleshooting guide with CLI commands and proxy configuration examples.

## Technologies Covered
- Envoy and Envoy Gateway
- HAProxy TCP forwarding, TLS termination, and backend TLS
- Kubernetes Services, EndpointSlices, and kubectl
- Gateway API Gateway, HTTPRoute, and TLSRoute
- ClientTrafficPolicy and PROXY protocol v2
- TLS, SNI, ALPN, OpenSSL, and jq

## Sources Consulted
- Envoy filter-chain matching: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto.html#config-listener-v3-filterchainmatch
- Envoy listener filters: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/listeners/listener_filters.html
- Envoy listener SNI configuration: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/sni.html
- Envoy response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Envoy Gateway TLS passthrough: https://gateway.envoyproxy.io/docs/tasks/security/tls-passthrough/
- Envoy Gateway ClientTrafficPolicy: https://gateway.envoyproxy.io/docs/tasks/traffic/client-traffic-policy/
- Envoy Gateway API reference (proxyProtocol, optional, deprecated enableProxyProtocol, port shifting, and listener health checks): https://gateway.envoyproxy.io/docs/api/extension_types/
- Envoy Gateway egctl guide: https://gateway.envoyproxy.io/docs/tasks/operations/egctl/
- Official egctl implementation and flags: https://github.com/envoyproxy/gateway/blob/main/internal/cmd/egctl/config_cmd.go
- Official egctl listener command: https://github.com/envoyproxy/gateway/blob/main/internal/cmd/egctl/config_listener.go
- Gateway API status guidance: https://gateway-api.sigs.k8s.io/guides/implementers-guide/
- Gateway API condition design: https://gateway-api.sigs.k8s.io/geps/gep-1364/
- HAProxy 3.2 configuration manual (file format, server TLS, SNI, field converter, and health-check SNI): https://docs.haproxy.org/3.2/configuration.html
- HAProxy TLS tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/basics-enable-tls/
- HAProxy PROXY protocol tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- OpenSSL s_client options: https://docs.openssl.org/3.5/man1/openssl-s_client/
- TLS server-name extension, RFC 6066: https://www.rfc-editor.org/rfc/rfc6066.html
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl explain: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/
- Kubernetes Service port mapping: https://kubernetes.io/docs/concepts/services-networking/service/
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Invalid multiline HAProxy directive.** The re-encryption example used shell-style backslash continuation. Changed the server directive to one physical line to follow HAProxy configuration syntax.
2. **Host port included in backend SNI.** Raw Host can contain a port, which is not part of a DNS SNI name. Added `field(1,:)` and explicitly limited the example to validated DNS authorities, with separate handling for IP literals.
3. **Incomplete certificate identity check.** OpenSSL `-servername` sends SNI but does not enable hostname verification. Added `-verify_hostname api.example.com`, retained `-verify_return_error`, and clarified private CA configuration.
4. **Ambiguous no-SNI diagnostic.** Removing `-servername` alone still sends SNI derived from the DNS connection target in modern OpenSSL. Specified replacing it with `-noservername` and removed the unrelated curl `-k` reference.
5. **Incorrect assumption about listener port 443.** Envoy Gateway shifts privileged container ports by default. Changed the listener inspection and packet-capture instructions to follow Service targetPort and node-port translation rather than require identical port numbers.
6. **Ambiguous status requirements.** The repair instructions required routes to be programmed without accounting for implementation-specific condition support. Distinguished Gateway/listener Accepted and Programmed from route-parent Accepted and ResolvedRefs, and required current-generation status.
7. **Health-check scope too broad.** The ClientTrafficPolicy listener health-check facility applies to HTTP/HTTPS. Clarified that it does not provide a TLS-passthrough health endpoint.

## Review Notes
- Confirmed the central distinction between HTTP 404 NR and downstream filter-chain selection failure, the TLS termination/passthrough models, and the role of TLS inspection in obtaining SNI and ALPN.
- Confirmed the egctl listener subcommand, label selectors, default proxy namespace, and YAML output against official source. The kubectl flags and jq projection are valid.
- Confirmed current proxyProtocol settings, rejection of missing headers by default, enableProxyProtocol deprecation, and precedence when both fields are set. Readers must continue checking their installed CRDs; documentation under latest and source on main can move.
- The Gateway-wide policy example applies across the targeted Gateway, so its sender coordination requirement includes all affected listeners. Deployment namespaces and ownership labels assume the normal separate-Gateway deployment model.
- All eight documentation links in the post resolved to relevant official resources. The older HAProxy server-side-encryption URL redirects to the current TLS basics tutorial.
- Examples contain documentation addresses, hostnames, certificate paths, and a Service placeholder that require replacement. HAProxy examples remain configuration fragments, as the post already explains.
- This was a documentation and static syntax review. HAProxy and egctl binaries were unavailable locally, and no live cluster, certificates, proxy deployment, or packet capture was supplied; end-to-end behavior was not executed. Bash code blocks were checked with bash -n, and the validation JSON was parsed successfully.
