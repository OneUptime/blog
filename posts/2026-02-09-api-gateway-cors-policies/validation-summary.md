# Validation Summary: How to Implement API Gateway CORS Policies for Cross-Origin Resource Sharing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Cross-Origin Resource Sharing (CORS)
- NGINX
- Kong Gateway CORS plugin
- Envoy CORS filter
- Istio VirtualService CORS policy
- Prometheus / PromQL
- curl

## Sources Consulted
- MDN Web Docs: Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: CORS-safelisted request header: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
- NGINX ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- NGINX ngx_http_map_module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Kong CORS plugin documentation: https://developer.konghq.com/plugins/cors/
- Kong CORS plugin configuration reference: https://developer.konghq.com/plugins/cors/reference/
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter.html
- Envoy CORS v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Istio VirtualService CorsPolicy reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/#CorsPolicy
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The CORS mechanics section stated that browsers first send a preflight request for cross-origin requests in general. This was corrected to specify non-simple requests, matching MDN's distinction between simple and preflighted CORS requests.
- The generic NGINX example reflected any `Origin` while also setting `Access-Control-Allow-Credentials: true`. This was unsafe for a generic example, so the credential header was removed from the unrestricted example and left in the allowlisted origin example.
- The NGINX examples returned dynamic `Access-Control-Allow-Origin` values without `Vary: Origin`. Added `Vary: Origin` to avoid incorrect cache reuse across origins.
- The restricted NGINX preflight example set `Access-Control-Allow-Credentials` on actual responses but not preflight responses. Added it to the preflight response for credentialed CORS consistency.
- The restricted-origin explanation implied every unauthorized request receives 403. Updated it to distinguish actual requests from preflight requests, which are blocked by the browser when no matching CORS allow-origin header is returned.
- The Kong dynamic origin example used a glob-style `https://*.example.com` pattern. Kong documents `origins` as flat strings or PCRE regexes, so this was changed to a PCRE regex.
- The credentials section implied that `Access-Control-Allow-Credentials: true` itself causes browsers to include cookies and authorization headers. Updated it to explain that application request credentials mode controls credentialed requests, while the response header controls whether the browser exposes the credentialed response.
- The Istio credentialed example used `maxAge: 3600`, but Istio's `maxAge` is a duration field and official examples use duration strings such as `24h`. Changed it to `1h`.
- The insecure Istio example used `prefix: "*"`, which is not a catch-all origin wildcard in Istio's `StringMatch` semantics. Changed it to `regex: ".*"` and clarified that catch-all origin matching with credentials is the dangerous configuration.
- The simple request header list omitted the currently safelisted `Range` header case. Added Range with the single-byte-range constraint.

## Review Notes
The PromQL examples are structurally valid, but assume the gateway metrics include `origin` and `cors_rejected` labels. In a real deployment those labels must be exported by the gateway, ingress, or instrumentation layer.
