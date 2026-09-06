# Validation Summary: Expose gRPC-Web Through Contour with HTTP/2, TLS, and CORS

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy routing, upstream protocols, timeouts, and access logs
- gRPC, gRPC-Web, HTTP/1.1, and HTTP/2
- TLS, certificate validation, SANs, and SNI
- Browser CORS
- Kubernetes Services, EndpointSlices, Secrets, and kubectl
- grpcurl, curl, Bash, and YAML

## Sources Consulted
- Contour 1.33 gRPC guide: https://projectcontour.io/docs/1.33/guides/grpc/
- Contour 1.33 CORS configuration: https://projectcontour.io/docs/1.33/config/cors/
- Contour 1.33 upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour 1.33 HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour 1.33 request rewriting: https://projectcontour.io/docs/1.33/config/request-rewriting/
- Contour 1.33 troubleshooting: https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/
- Contour v1.33.0 CRDs: https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/01-crds.yaml
- Contour v1.33.0 HTTPProxy processor, including determineSNI: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- gRPC-Web protocol: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
- Native gRPC HTTP/2 protocol: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- grpcurl usage: https://github.com/fullstorydev/grpcurl
- grpcurl command flag definitions: https://github.com/fullstorydev/grpcurl/blob/master/cmd/grpcurl/grpcurl.go
- Kubernetes kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Envoy access logging: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- curl manual: https://curl.se/docs/manpage.html
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
1. **Public reflection test did not match the route.** The public `grpcurl list` command invokes the reflection service, which is excluded by `/orders.v1.OrderService/`. Replaced it with a call to `orders.v1.OrderService/GetOrder` using a local descriptor set and JSON request file. Explicitly identified these required user-supplied files and explained why public reflection fails with the shown route.
2. **Incorrect description of gRPC-Web status transport.** The post described final status as response trailers or translated headers without explaining body framing. Corrected it to identify the trailer frame inside the response body and the headers-only exception. Readers are directed to the final status decoded by the client.
3. **HTTP 415 diagnosis conflated content-type rejection with an unmatched route.** Corrected the table to distinguish unsupported content types from the normal HTTP 404 response for an unmatched Envoy route.
4. **HTTPProxy conditions were conflated with per-request logging.** Conditions describe configuration validity, not individual request IDs. Clarified the separate checks and retained request-ID correlation for access-log entries.
5. **Log command could omit the handling Envoy pod.** Added `--all-pods=true` so the DaemonSet log query covers all its pods. Added a brief instruction to adapt the namespace and workload name to the installation.

## Review Notes
- Confirmed automatic gRPC-Web translation, upstream `h2c` versus `h2`, virtual-host CORS scope, exact origins and regex handling, timeout field names, and per-Service Host rewriting against Contour documentation and source.
- Retained deprecated `subjectName` intentionally: the v1.33.0 CRD still requires it. `subjectNames` is optional, but its first entry must match the singular field when present. Removing the singular field would invalidate this version's example. The published TLS guide has inconsistent mandatory-field wording; the CRD resolves it.
- Confirmed from `determineSNI` that the configured Service Host rewrite supplies SNI; certificate subject validation alone does not supply SNI for a ClusterIP Service.
- Parsed both YAML blocks and checked their fields, required keys, and enum values against the official v1.33.0 HTTPProxy CRD, embedding the TLS Service fragment in the full example. Checked the subject-name equality constraint separately. This was a targeted structural check, not a Kubernetes admission test.
- All Bash blocks passed `bash -n`; CLI flags and usage were reviewed against official references/source. No cluster, real Orders service, certificates, browser client, or proto descriptors were supplied, so runtime connectivity and browser CORS behavior were not exercised.
- The example assumes existing Services, ready endpoints, DNS, TLS Secrets, and application-specific credentials. The diagnostic image is deliberately unpinned in the example and already accompanied by production pinning guidance. Reflection availability remains an application prerequisite for the internal `list` command.
- Referenced documentation links resolved to the intended resources. The review targets Contour 1.33 explicitly and does not assert that it is the latest release.
