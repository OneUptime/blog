# Validation Summary: Fix Contour 504s by Aligning Route Timeouts

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes configuration and CLI examples.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy routing, timeout policies, retries, and access logs
- Kubernetes Services, EndpointSlices, TLS Secrets, and kubectl
- HTTP/1.1, HTTP/2, upstream keepalive connections, and curl
- Application deadlines, idempotency, and asynchronous jobs

## Sources Consulted
- [Contour 1.33 request routing](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 access logging](https://projectcontour.io/docs/1.33/config/access-logging/)
- [Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/)
- [Envoy timeout configuration](https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts)
- [Envoy HTTP route and retry API](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto)
- [Envoy HTTP connection manager API](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html)
- [Envoy router retry conditions](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html)
- [Envoy access logging](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage)
- [Envoy substitution formatter and response flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter)
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [curl manual](https://curl.se/docs/manpage.html)

## Issues Found
- The UF row included failure to maintain an established upstream connection. Narrowed it to failure to establish the connection; Envoy distinguishes connection termination (UC) and remote reset (UR) from connection failure (UF).
- The per-try timeout explanation unconditionally tied its cutoff to arrival of upstream response headers. Clarified that it applies until a response starts being sent downstream, which normally follows upstream headers, as specified by Envoy's timeout documentation.
- The response-flags link led to the general access-log page, whose current version delegates operator definitions to the substitution formatter reference. Updated the link to the response-flags reference.

## Review Notes
- Confirmed the Contour 1.33 timeout fields, duration syntax, default behavior, supported retry conditions, retry count, service references, TLS configuration, and Valid condition against the versioned documentation. No deprecated API was identified in these examples for the stated version.
- Confirmed the route response timer begins after receipt of the complete request and covers the complete response. Idle timeouts and upstream idle connections have different scopes. The HTTP connection manager documentation supports the post's 408-before-headers versus reset-after-headers explanation.
- The example's 45-second idle limit can terminate a silent report request before its two-minute response budget. This is consistent with the instruction to choose an idle limit from the maximum legitimate silent interval; these values are illustrative, not a guarantee that a silent two-minute job will finish.
- Two retries permit at most three attempts. Backoff, connection acquisition, and response transfer consume the available overall budget; the five-second stream idle limit may end the status request earlier. The retry fragment belongs inside spec.routes, not in a standalone Kubernetes manifest.
- Verified curl flags and timing variables, kubectl apply flags, and condition-wait syntax against their official manuals. Parsed both YAML examples and checked both shell blocks with bash -n. Validated the generated JSON and checked the patch for whitespace errors.
- Review was documentation-based with local syntax checks. No live Kubernetes deployment, server-side dry run, endpoint request, or load test was performed. Running the examples requires installed Contour CRDs/controller, the reports namespace, referenced Services and TLS Secret, and working DNS/network access.
- Contour references are pinned to 1.33. Envoy latest links are rolling documentation and may describe a newer Envoy than the deployed Contour installation; check the deployed version when investigating differences. Documentation links resolved to the intended official resources, with the response-flags destination corrected as described above.
