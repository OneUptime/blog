# Validation Summary: Verify Contour Upstream TLS with a Custom CA and SNI

## Status

validated

## Post Type

Technical guide with Kubernetes configuration and TLS troubleshooting commands.

## Technologies Covered

- Contour 1.33 and HTTPProxy
- Envoy upstream TLS, SNI, certificate validation, and access logging
- Kubernetes Services, EndpointSlices, Secrets, DNS, and NetworkPolicy
- X.509 certificate authorities and DNS Subject Alternative Names
- OpenSSL, kubectl, curl, and HTTP/2 gRPC

## Sources Consulted

- Contour upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour request rewriting: https://projectcontour.io/docs/1.33/config/request-rewriting/
- Contour HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour architecture: https://projectcontour.io/docs/1.33/architecture/
- Contour access logging: https://projectcontour.io/docs/1.33/config/access-logging/
- Contour v1.33.0 protocol and SNI implementation (`getProtocol`, `determineSNI`, and upstream validation processing): https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- Contour v1.33.0 CA lookup and subject-name compatibility checks: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/cache.go
- Contour v1.33.0 Secret validation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/secret.go
- Contour v1.33.0 CRD schemas: https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/01-crds.yaml
- Envoy upstream TLS contexts: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto
- Kubernetes Service DNS: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes network policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl Secret creation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- OpenSSL s_client options: https://docs.openssl.org/3.0/man1/openssl-s_client/
- curl command reference: https://curl.se/docs/manpage.html
- TLS 1.3 certificate alerts, including unknown_ca: https://www.rfc-editor.org/rfc/rfc8446.html#section-6.2

## Issues Found

1. **The network probe did not reproduce Envoy's endpoint path.** The original explanation implied that Envoy resolves the ClusterIP Service DNS name. Contour instead supplies discovered endpoint addresses. Corrected the explanation and instructed readers to repeat the probe against each ready endpoint address and EndpointSlice port while preserving certificate verification and SNI names.
2. **Matching egress policy alone does not establish equivalent access.** Backend ingress policy can depend on source Pod and namespace selectors. Corrected the diagnostic placement guidance to account for both directions and effective access.
3. **The OpenSSL command does not offer HTTP/2 ALPN by default.** Clarified that the original command checks TLS negotiation and that HTTP/2 checks require `-alpn h2` and confirmation of the selected protocol.
4. **The CA validation statement was too broad.** Contour's CA-bundle checks inspect PEM structure and block types, but do not establish that every certificate is usable by Envoy. Replaced the blanket malformed-Secret assertion with the actual checks and clarified the limits of valid HTTPProxy status.
5. **Log collection could miss the test request.** Logging a DaemonSet without `--all-pods=true` selects one pod. Added that flag and removed the filter for the public hostname, which may no longer appear as authority after rewriting. Added concise guidance for request correlation and installation-specific log destinations.
6. **Unknown-CA alerts were interpreted without considering direction.** An alert received from a backend can mean it rejected a client certificate in mTLS. Replaced the table entry with upstream verification-failure guidance and explained this distinction.

## Review Notes

- The two HTTPProxy YAML examples retain their original configuration. The v1.33.0 implementation confirms explicit protocol precedence, TLS validation for `tls` and `h2`, and static service Host rewrite precedence over route rewrite and ExternalName when selecting SNI.
- The deprecated `subjectName` field is intentionally retained: the reviewed CRD requires it, and the first `subjectNames` entry must match. Removing it merely to avoid a deprecated field would break this version's configuration.
- The upstream-TLS documentation contains older annotation-only wording. Its introductory protocol description, API reference, and pinned implementation confirm that an explicit HTTPProxy protocol works without the annotation.
- Opaque is an appropriate type for the illustrated CA-only Secret. The implementation also accepts TLS-type CA Secrets; the tutorial does not require using that alternative.
- The Service DNS example assumes the cluster domain is `cluster.local`. Names, ports, paths, certificates, the edge TLS Secret, and workload names are deployment-specific prerequisites.
- Reviewed CA overlap rotation, separate edge/upstream identities, SAN verification, static SNI selection, and public-only trust-bundle handling. All five official documentation links in the post resolve to the intended resources.
- Validation is a documentation and source-code review, with local syntax checks. No live Kubernetes cluster, deployed backend, certificate files, or successful end-to-end TLS handshake was available or claimed. Envoy's linked `latest` documentation is rolling; version-specific Contour conclusions were checked against v1.33.0 source and schemas.
