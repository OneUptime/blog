# Validation Summary: gRPC Through Istio Fails with 503 UR: Diagnose HTTP/2 Negotiation, mTLS, and Upstream Resets

## Status
validated

## Post Type
Technical troubleshooting guide with terminal commands and Kubernetes configuration fragments.

## Technologies Covered
- Istio sidecars, gateways, protocol selection, PeerAuthentication, and DestinationRule
- Envoy access logging, upstream clusters, endpoints, resets, retries, and timeouts
- gRPC, grpcurl, HTTP/2, ALPN, and graceful shutdown
- Kubernetes Services, Pods, EndpointSlices, and kubectl
- TLS, mutual TLS, OpenSSL, and workload identities
- Bash-compatible shell commands, YAML, JSON, and jq

## Sources Consulted
- Envoy response flags and logging fields: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Envoy response details: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details
- Envoy cluster schema and transport socket matching: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy timeout semantics: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts
- Envoy routing and retries: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing.html
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio TLS configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio proxy diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio CLI reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio access logging: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio trust-domain aliases: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Kubernetes Services and named target ports: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- grpcurl maintained CLI implementation: https://github.com/fullstorydev/grpcurl/blob/master/cmd/grpcurl/grpcurl.go
- gRPC debugging: https://grpc.io/docs/guides/debugging/
- OpenSSL s_client: https://docs.openssl.org/3.5/man1/openssl-s_client/
- HTTP/2 specification, including GOAWAY and RST_STREAM: https://www.rfc-editor.org/rfc/rfc9113.html
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Reset categories were too broadly associated with UR.** Clarified that transport, protocol, connection termination, and timeout failures can produce other flags. Updated the rollout example accordingly; an abrupt connection close does not necessarily produce a remote stream reset.
2. **Missing access logs were treated as conclusive path evidence.** Required connection-level corroboration and explained that TLS failures may precede HTTP logging and HTTP/2 may reuse connections. Added the relevant limitation that Deployment log commands select one Pod by default, so replica-specific correlation is necessary.
3. **Cluster JSON was presented as containing endpoint addresses.** Directed readers to endpoint output for EDS addresses and included transport socket matches when checking mTLS selection.
4. **OpenSSL verification was incomplete.** Added an explicit approved CA file and hostname verification. SNI alone does not verify the certificate hostname.
5. **The ALPN interpretation did not match the command.** A client offering only h2 cannot validly negotiate http/1.1. Clarified that a close after this handshake-only, EOF-terminated test does not independently establish a broken listener.
6. **Policy inspection was described as effective-policy verification.** Reworded the introduction to distinguish resource inspection from confirmation of the effective proxy configuration.
7. **Matching trust-domain names were implied to be mandatory.** Changed the check to trusted certificate chains and compatible identities, accounting for configured aliases.
8. **GOAWAY was described as exclusively graceful.** Explained that it also reports connection errors and that its error code and last-stream ID matter.
9. **Rollout success implied indefinite stream survival.** Clarified that streams must finish within the drain window or reconnect according to application design; terminating a Pod cannot preserve an indefinitely running stream.

## Review Notes
- Reviewed every command block and both YAML fragments against the relevant CLI, schema, or maintained implementation. The Service protocol selection, appProtocol precedence, named target port, grpcurl TLS/plaintext modes, reflection caveat, and workload-port versus Service-port distinction are correct.
- Checked shell syntax locally without executing the diagnostic commands. These examples require real namespaces, Pod names, Services, certificates, and a candidate grpc-routing.yaml; the YAML blocks are fragments rather than complete apply-ready manifests.
- This was a documentation and static review. No Kubernetes cluster, live certificates, gRPC server, rollout, or streaming RPC was exercised, and no infrastructure configuration was applied.
- All eight documentation links in the post resolved to the intended resources. The author link is attribution rather than technical evidence.
- The guide addresses Istio sidecar mode. Ambient mesh and application TLS passthrough require different inspection paths; HTTP routing visibility assumes an HTTP-aware proxy hop.
- No specific product release is claimed. The latest documentation URLs are moving targets, particularly Envoy development documentation. Readers should check their installed Istio/Envoy version; response-code detail strings can change, and istioctl x describe remains experimental.
- Access logging must actually be enabled to obtain request records; general proxy logs do not guarantee an HTTP access record. Long-lived stream retry and drain behavior also depend on application semantics and effective configuration.
