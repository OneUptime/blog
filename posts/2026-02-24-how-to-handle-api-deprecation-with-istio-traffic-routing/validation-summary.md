# Validation Summary: How to Handle API Deprecation with Istio Traffic Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Telemetry API
- Istio EnvoyFilter
- Istio AuthorizationPolicy
- Envoy Lua HTTP filter
- Prometheus queries
- Kubernetes kubectl commands
- HTTP Deprecation, Sunset, Link, 410, and 308 semantics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Envoy Lua HTTP filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- RFC 9745, The Deprecation HTTP Response Header Field: https://www.rfc-editor.org/rfc/rfc9745.html
- RFC 8594, The Sunset HTTP Header Field: https://www.rfc-editor.org/rfc/rfc8594
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- IANA Link Relation Types registry: https://www.iana.org/assignments/link-relations/

## Issues Found
- The post incorrectly attributed the `Deprecation` header to RFC 8594 and used `deprecation: "true"`. Updated the reference to RFC 9745 and changed the header value to the RFC 9745 structured date format.
- The Telemetry example queried `request_url_path`, which is not a standard Istio metric label and was not added by the example. Added a `request_path` tag override and updated Prometheus queries to use it.
- The Telemetry example tried to derive `api_version` from `x-api-version`, but the post only added that as a response header. Changed the metric expression to classify requests by URL path instead.
- The gradual migration section described percentage routing as "redirecting." Changed the wording to "routing" because the VirtualService example uses weighted routing, not HTTP redirects.
- The Lua EnvoyFilter section said it returned response-body warnings, but the code added request headers to the upstream request. Updated the text to say warning headers and changed the Lua script to add headers during `envoy_on_response`.
- The Lua filter used deprecated `inlineCode` style configuration. Updated it to Envoy v3 `default_source_code.inline_string`.
- The Lua example used Unix timestamp `1751328000`, which is July 1, 2025, not July 1, 2026. Updated it to `1782864000`.
- The Prometheus `curl` examples embedded PromQL directly in the URL, which can break on braces, brackets, and spaces. Changed them to `curl -sG` with `--data-urlencode`.
- The 410 Gone explanation said the URL "will never work again." Updated it to the RFC-aligned "expected to be permanently unavailable" wording.

## Review Notes
The examples are technically consistent with current Istio and Envoy references after the fixes. The custom `request_path` label can create high-cardinality Prometheus series if applied to paths with IDs or other unbounded segments; in production, prefer route templates or operation IDs when available.
