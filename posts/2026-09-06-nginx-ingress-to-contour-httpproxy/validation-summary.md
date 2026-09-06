# Validation Summary: Migrate NGINX Ingress Annotations to Contour HTTPProxy

## Status
validated

## Post Type
Technical migration guide with Kubernetes configuration and command examples.

## Technologies Covered
- Kubernetes Ingress, Services, Secrets, ingress classes, and kubectl
- Community ingress-nginx and its controller-specific annotations
- Contour 1.33 HTTPProxy and ExtensionService APIs
- Envoy routing, retries, timeouts, WebSockets, external authorization, and IP filtering
- TLS certificate validation, SNI, HTTP headers, CORS, and session affinity
- DNS cutover, curl, jq, Bash, YAML, and JSON

## Sources Consulted
- Contour 1.33 annotations: https://projectcontour.io/docs/1.33/config/annotations/
- Contour 1.33 HTTPProxy fundamentals: https://projectcontour.io/docs/1.33/config/fundamentals/
- Contour 1.33 API reference: https://projectcontour.io/docs/1.33/config/api/
- Contour 1.33 request routing: https://projectcontour.io/docs/1.33/config/request-routing/
- Contour 1.33 request rewriting: https://projectcontour.io/docs/1.33/config/request-rewriting/
- Contour 1.33 upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour 1.33 TLS termination: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour 1.33 WebSockets: https://projectcontour.io/docs/1.33/config/websockets/
- Contour 1.33 IP filtering: https://projectcontour.io/docs/1.33/config/ip-filtering/
- Contour 1.33 external authorization: https://projectcontour.io/docs/1.33/guides/external-authorization/
- Contour v1.33.0 CRD schemas: https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/01-crds.yaml
- Contour v1.33.0 API types: https://github.com/projectcontour/contour/blob/v1.33.0/apis/projectcontour/v1/httpproxy.go
- Contour v1.33.0 routing, prefix expansion, and SNI implementation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- Contour v1.33.0 upstream certificate validation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/cache.go
- ingress-nginx annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx annotation risks: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/
- Kubernetes ingress-nginx retirement notice: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Kubernetes Ingress API: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- curl manual, including --resolve: https://curl.se/docs/manpage.html
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Deprecated upstream certificate-name field was not explained.** The TLS example used only `subjectName`, which Contour 1.33 deprecates in favor of `subjectNames`. Added the plural field and a compatibility explanation. Retained `subjectName` because the v1.33.0 CRD still requires it; when the plural field is supplied, its first entry must equal the singular value. Simply replacing the field would make the example invalid.
2. **The Contour comparison request did not match the example virtual host.** The command requested `migration.shop.example.com`, while the HTTPProxy configures `shop.example.com` and its TLS Secret. Changed the Contour request to the configured hostname and explained replacing the IP placeholders. Both requests now preserve the same hostname while selecting separate controller addresses through `--resolve`, without a DNS change.

## Review Notes
- Reviewed this as a version-specific Contour 1.33 guide; the versioned API and source were used to resolve documentation ambiguities.
- Parsed all four YAML blocks and checked each against the relevant portion of the official v1.33.0 CRD schema with a Draft 4 JSON Schema validator. Separately checked the certificate-name equality constraint. This is static schema validation, not Kubernetes admission or complete CEL evaluation.
- All three Bash blocks passed `bash -n`. Executed the jq inventory filter against synthetic Ingress objects with and without annotations and verified the output.
- Verified upstream protocol values, service-level Host rewriting and SNI selection, CA Secret structure, prefix rewriting, WebSocket configuration, timeout fields, retry conditions, relative service weights, cookie affinity, CORS scope, TLS redirects, ingress-class selection, and HTTPProxy status fields.
- The versioned routing implementation expands prefix matches to handle slash boundaries; the `/api` to `/` example does not need an extra route merely to avoid a doubled slash on `/api/health`.
- The upstream TLS guide contains legacy wording suggesting a Service annotation is always necessary. The annotations reference and v1.33.0 implementation confirm that the explicit service `protocol: tls` field used here is sufficient to select TLS and enable configured certificate validation.
- Confirmed the documented v3 gRPC external authorization requirement and the distinction between physical Peer and derived Remote addresses. The migration warnings about authentication, trusted proxy hops, retries, and non-equivalent canary selectors are appropriate.
- Confirmed the retirement notice's March 2026 maintenance cutoff and the frozen but retained Kubernetes Ingress API. The post's linked technical documentation resolves to the intended resources.
- No live cluster or application endpoints were provided. Controller reconciliation, certificate handshakes, authentication flows, WebSocket upgrades, traffic distribution, and DNS rollback behavior were not exercised. The post correctly requires deployment-specific comparison tests before cutover; DNS rollback also depends on caching and existing connections.
