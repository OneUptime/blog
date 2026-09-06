# Validation Summary: Enable WebSockets and SignalR on One Contour Route

## Status
validated

## Post Type
Technical configuration guide with Kubernetes commands and HTTPProxy YAML examples.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy HTTP routing, upgrades, timeouts, and access logs
- ASP.NET Core SignalR, WebSockets, Server-Sent Events, and long polling
- Kubernetes Services, EndpointSlices, TLS Secrets, and kubectl
- Cookie session affinity, Redis backplanes, and Azure SignalR Service
- curl, HTTPS, authentication, and browser origin restrictions

## Sources Consulted
- Contour 1.33 WebSockets: https://projectcontour.io/docs/1.33/config/websockets/
- Contour 1.33 request routing: https://projectcontour.io/docs/1.33/config/request-routing/
- Contour 1.33 API reference: https://projectcontour.io/docs/1.33/config/api/
- Contour 1.33 cookie rewriting: https://projectcontour.io/docs/1.33/config/cookie-rewriting/
- Contour 1.33 access logging: https://projectcontour.io/docs/1.33/config/access-logging/
- Contour 1.33 global configuration: https://projectcontour.io/docs/1.33/configuration/
- Contour 1.33 TLS termination: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour v1.33.0 route generation source: https://github.com/projectcontour/contour/blob/v1.33.0/internal/envoy/v3/route.go
- Contour v1.33.0 route sorting source: https://github.com/projectcontour/contour/blob/v1.33.0/internal/sorter/sorter.go
- Envoy upgrade handling: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades
- Envoy timeout reference: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts
- Envoy route API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy v1.35.0 HTTP connection manager source: https://github.com/envoyproxy/envoy/blob/v1.35.0/source/common/http/conn_manager_impl.cc
- Microsoft SignalR hosting and scaling: https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-10.0
- Microsoft SignalR configuration: https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration?view=aspnetcore-10.0
- Microsoft SignalR security considerations: https://learn.microsoft.com/en-us/aspnet/core/signalr/security?view=aspnetcore-10.0
- ASP.NET Core SignalR transport protocol specification: https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/TransportProtocols.md
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- curl option reference: https://curl.se/docs/manpage.html

## Issues Found
1. **Incorrect upgrade failure status.** The diagnostic table associated HTTP 426 with a disabled route upgrade. Envoy's connection manager rejects a disallowed upgrade with HTTP 403 and the `upgrade_failed` response-code detail. Updated the row to identify that diagnostic and distinguish other authorization-related 403 responses.
2. **Route-source metadata overstated.** The post said this metadata identified the matched route. Contour exposes the source resource's kind, namespace, and name, which are identical for both routes in this HTTPProxy. Corrected the text to explain that limitation and correlate the path and upstream cluster with generated Envoy routing configuration.
3. **Affinity example dropped fallback timeout settings.** The replacement hub route omitted the first example's timeout policy. This reintroduces the default response timeout and can break fallback traffic: SignalR long polling defaults to a 90-second poll, while Envoy's default response timeout is 15 seconds. Retained the original `response: 1h` and `idle: 5m` settings in the affinity example.

## Review Notes
- Verified the HTTPProxy API version, field names, route-level upgrade setting, TLS Secret reference, Service port, duration syntax, and cookie strategy against Contour 1.33. No deprecated fields were identified in these examples.
- Checked Contour's versioned implementation for leading regex anchoring and route sorting. Regex routes precede prefix routes, so the hub route takes precedence over `/` independently of YAML ordering. The bounded expression excludes adjacent names such as `/realtime-admin`; query strings are excluded from path matching.
- Confirmed the SignalR negotiate endpoint, transport options, session-affinity exceptions, and Redis backplane caveat. Affinity still depends on clients returning the cookie and can change when backend membership changes.
- Confirmed the generated affinity cookie name and support for rewriting Secure and SameSite attributes.
- Checked timeout definitions and global duration settings. The one-hour response timeout remains an example: finite response limits can interrupt an SSE stream even when keepalives prevent idle expiry. Transport-specific operational testing is still required.
- Checked kubectl resource syntax, namespace and output flags, the EndpointSlice Service label, container selection, and the relative log time filter. The shown DaemonSet log command selects a pod by default; use `--all-pods=true` with a supporting kubectl version when investigating traffic across all Envoy replicas. Deployment names and namespaces must match the installation, and host filtering requires a log format containing the authority.
- Checked curl's resolve, request, header, data, silent, and verbose options. The address, hostname, Services, and TLS Secret are illustrative deployment values. An authenticated hub also requires appropriate credentials when running the negotiate request.
- Confirmed browser origin restrictions and the distinction between CORS and authentication. The 101 handshake check applies to the HTTP/1.1 upgrade flow described here.
- All six documentation references target the intended resources. The two locale-neutral Microsoft links initially failed in the browsing tool; their explicit English ASP.NET Core 10.0 equivalents were accessible and reviewed. Contour checks use the stated 1.33 version; Envoy latest and Microsoft's versionless links may change over time.
- Performed a documentation and source review plus local syntax checks. No live Kubernetes cluster, TLS endpoint, or SignalR application was supplied, so no deployment, handshake, message exchange, or fallback runtime test was performed.
