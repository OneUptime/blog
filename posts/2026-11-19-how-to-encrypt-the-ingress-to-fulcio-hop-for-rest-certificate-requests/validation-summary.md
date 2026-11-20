# Validation Summary: How to Encrypt the Ingress-to-Fulcio Hop for REST Certificate Requests

## Status

validated

## Post Type

Technical configuration and troubleshooting guide.

## Technologies Covered

- Sigstore Fulcio REST and gRPC listeners, including duplex mode
- TLS serving certificates, CA trust, hostname verification, and SNI
- Kubernetes Deployments, Services, Ingress, DNS, and readiness probes
- NGINX HTTPS reverse proxying
- curl, OIDC bearer tokens, and service mesh transport security
- Mermaid flowcharts

## Sources Consulted

- [Fulcio setup guide: serving over TLS](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#serving-over-tls) — listener support, serving material, TLS defaults, and root-certificate diagnostic endpoint.
- [Fulcio serve command source](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go) — command registration, HTTP TLS flags, paired certificate/key validation, and duplex TLS handling.
- [Fulcio HTTP TLS issue #2415](https://github.com/sigstore/fulcio/issues/2415) — historical REST transport limitation.
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify) — HTTPS upstreams, SNI, verification name, trusted PEM certificates, verification enablement, and chain depth.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource lookup, namespace selection, and YAML output.
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/#tls) — ingress TLS termination and controller-specific behavior.
- [Kubernetes Service DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) — service DNS name structure.
- [Kubernetes probe configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — HTTP/HTTPS probe behavior.
- [curl TLS certificate verification](https://curl.se/docs/sslcerts.html) — CA-file selection and URL hostname verification.
- [curl command reference](https://curl.se/docs/manpage.html#--fail) — HTTP error handling with `--fail`.
- [Istio PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/) — strict versus permissive mesh transport policies.
- [Mermaid flowchart syntax](https://mermaid.js.org/syntax/flowchart.html) — direction, nodes, arrows, and edge labels.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post contains actionable technical examples and remains relevant.
- The upstream source defines both HTTP TLS flags and rejects an unmatched certificate/key pair. The setup guide confirms their use for separate HTTP and shared duplex listeners. The post correctly requires checking the deployed image instead of assuming that documentation on `main` applies to every release. No minimum released version was asserted or independently established.
- The NGINX block is valid within an appropriate server configuration. HTTPS upstream transport, SNI, expected hostname, CA trust, and certificate verification are configured explicitly. The selected verification depth must accommodate the deployed certificate chain.
- Port 5555 and the service DNS name are illustrative. Operators must use the actual Service port and cluster DNS suffix. The commands and shell continuation are syntactically valid; the Mermaid diagram uses supported syntax.
- The root-certificate GET route is documented by Fulcio. curl verifies the URL hostname and serving trust chain; a successful direct request does not prove that ingress verification or authenticated issuance works. The post appropriately calls for public-ingress signing, signature verification, and negative verification tests. Negative tests should exercise the proxy route itself.
- Additional operational caveats: current Fulcio documentation specifies a default TLS 1.3 minimum and a restart to load rotated HTTP/duplex serving certificates. NGINX enables upstream TLS 1.3 by default starting with 1.23.4; older deployments need compatible protocol configuration. Kubernetes HTTPS probes do not verify server certificates and therefore cannot replace the identity-verification tests.
- Review was based on official documentation and source inspection. No live Kubernetes deployment, serving certificates, or staging signing environment was supplied, so runtime rollout and end-to-end issuance were not executed.
