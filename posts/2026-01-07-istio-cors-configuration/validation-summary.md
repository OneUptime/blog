# Validation Summary: How to Configure CORS Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService, Gateway, DestinationRule, EnvoyFilter, and Telemetry API
- Envoy CORS filter and access logging
- Kubernetes custom resources
- CORS HTTP headers and browser preflight behavior
- Prometheus Operator ServiceMonitor and PromQL
- `istioctl` debugging commands

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- MDN Access-Control-Max-Age reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age
- MDN Access-Control-Expose-Headers reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers
- MDN Set-Cookie reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
- The prefix-based origin example claimed `prefix: "https://"` allowed HTTPS subdomains of `example.com`. That actually matches any HTTPS origin, so the example was changed to a controlled preview hostname prefix.
- The preflight flow diagram implied unmatched preflights return 403. Istio's `unmatchedPreflights` default is to forward unmatched preflights upstream, so the diagram was corrected.
- The `maxAge` guidance said most browsers cap preflight caching at 24 hours. MDN documents Firefox at 24 hours and Chromium at 2 hours, so the guidance and example value were corrected.
- The credentials example exposed `set-cookie`. Browsers filter `Set-Cookie` from frontend JavaScript even if listed in `Access-Control-Expose-Headers`, so it was removed.
- The development example used wildcard `allowHeaders` and `exposeHeaders` with `allowCredentials: true`. Browser wildcard semantics do not apply to credentialed requests, so those were replaced with explicit development headers.
- The wildcard-origin anti-pattern used `exact: "*"`, which is misleading for Istio's `StringMatch`. It was changed to a catch-all regex example and clarified.
- The route inspection `jq` command assumed a fixed route config name and location. It was replaced with a generic search for CORS config objects in the route dump.
- The debugging VirtualService attempted to set a response header from `%REQ(origin)%`, which is an Envoy access-log formatter rather than a VirtualService header substitution. It was replaced with a fixed debug route marker.
- The PromQL examples filtered by `request_method`, which is not a default Istio metric label. A Telemetry API example was added to create a bounded `request_method` tag for the ingress gateway before using the queries.

## Review Notes
The Istio examples use current `networking.istio.io/v1beta1` resources and the CORS fields documented on `VirtualService.corsPolicy`. The EnvoyFilter access-log example is technically plausible but version-sensitive; for production documentation, Istio's Telemetry API access logging may be preferable in newer installations.
