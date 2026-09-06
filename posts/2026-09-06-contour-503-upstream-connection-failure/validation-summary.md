# Validation Summary: Troubleshoot Contour 503 Upstream Connection Failures

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and an HTTPProxy YAML configuration fragment.

## Technologies Covered
- Contour 1.33 and HTTPProxy
- Envoy access logging, response flags, upstream clusters, and metrics
- Kubernetes Services, EndpointSlices, Pods, NetworkPolicy, and kubectl
- HTTP/1.1, HTTP/2, gRPC, TLS, SNI, and certificate SAN validation
- curl, OpenSSL, and shell utilities

## Sources Consulted
- Contour common proxy errors: https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/
- Contour access logging: https://projectcontour.io/docs/1.33/config/access-logging/
- Contour upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour configuration and timeout defaults: https://projectcontour.io/docs/1.33/configuration/
- Contour request rewriting: https://projectcontour.io/docs/1.33/config/request-rewriting/
- Contour v1.33.0 implementation, including getProtocol and determineSNI: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- Envoy access logging: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy response flag definitions and substitution operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy request ID handling: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers#x-request-id
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ephemeral containers: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- curl command reference: https://curl.se/docs/manpage.html
- OpenSSL s_client reference: https://docs.openssl.org/3.5/man1/openssl-s_client/

## Issues Found
1. **Unreliable request correlation.** An external X-Request-ID can be replaced by Envoy. Added a unique User-Agent marker to the same request and searched for that marker with fixed-string matching; Contour's default access log includes User-Agent.
2. **Incomplete replica log coverage.** The DaemonSet and Deployment log commands default to one Pod. Added --all-pods=true and --tail=-1 so the selected time window covers all current workload Pods without a tail limit.
3. **Overgeneralized UF timing.** UF does not imply that a timeout elapsed. Limited the two-second observation to connection timeouts in Contour and noted that refusal can fail immediately.
4. **Readiness caveat omitted.** EndpointSlice readiness can be forced true by publishNotReadyAddresses. Updated the checklist to check actual Pod readiness in that case.
5. **Direct-test assumptions and diagnosis.** Plaintext curl examples are not appropriate for every upstream protocol, and cluster.local is configurable. Made the example assumptions explicit. Added DNS and selection of another failing endpoint as explanations for a successful direct endpoint test followed by a failed Service test.
6. **Incorrect ephemeral-container cleanup.** Kubernetes cannot remove an individual ephemeral container from an existing Pod. Replaced the removal instruction with process exit, standalone diagnostic Pod cleanup, and the lifetime of the ephemeral-container record.
7. **Incorrect omitted-protocol behavior.** An absent HTTPProxy protocol field falls back to Service annotations. Corrected the HTTP/1.1 default description to include that precedence.
8. **Protocol mismatch flag overgeneralization.** Cleartext HTTP to a TLS listener can fail after TCP establishment, rather than generating UF. Distinguished TLS handshake failures from connection termination or upstream protocol errors (UC/UPE).
9. **TLS validation prerequisites and deprecation.** Clarified the CA Secret's ca.crt PEM bundle and documented the deprecated subjectName compatibility field alongside the matching first subjectNames entry for Contour 1.33. Preserved the YAML fields required by the version discussed.
10. **OpenSSL hostname verification omitted.** SNI and a CA bundle alone do not check the requested DNS identity. Specified -verify_hostname and -verify_return_error alongside -servername and -CAfile.

## Review Notes
- The post is technically relevant and salvageable; it is validated after the corrections above.
- Confirmed Service port versus resolved endpoint port, HTTPProxy validity versus backend health, default log fields, response flags, and the cited upstream metrics. NetworkPolicy troubleshooting correctly distinguishes the Contour control plane from the Envoy data plane.
- Verified the SNI claim against Contour v1.33.0 source: service-level Host rewriting takes precedence over route-level rewriting, then ExternalName is used. SAN validation does not determine SNI. The explicit protocol field selects TLS without requiring an additional Service annotation; portions of the upstream TLS prose describe the annotation-based alternative more restrictively than the implementation.
- The YAML is a services fragment for an HTTPProxy route, not a complete manifest. Names, IPs, ports, namespaces, CA material, and workload layout are illustrative and must match the reader's installation.
- Contour references are pinned to 1.33. Envoy latest and Kubernetes documentation are moving references; deployments should use documentation and CLI versions compatible with their installed components. The existing access-log URL resolves and links onward to the current response-flag reference.
- Reviewed commands against official CLI references and checked shell syntax locally. Parsed the YAML fragment and validation JSON locally. No live Kubernetes cluster, application, or certificate bundle was supplied, so network behavior and TLS handshakes were not exercised.
- Original sections and writing style were retained; edits address technical correctness only.
