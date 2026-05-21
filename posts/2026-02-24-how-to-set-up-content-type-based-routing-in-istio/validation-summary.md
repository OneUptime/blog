# Validation Summary: How to Set Up Content-Type Based Routing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- HTTP Content-Type and Accept headers
- gRPC over HTTP/2
- curl
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- RFC 9110 HTTP Semantics, Content-Type and media types: https://www.rfc-editor.org/rfc/rfc9110
- everything curl, multipart formposts: https://everything.curl.dev/http/post/multipart.html
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Content-Type variation example said it handled `Application/JSON`, but Istio `exact` and `prefix` header value matches are case-sensitive. Updated the example to use case-insensitive RE2 regex patterns with `(?i)` for JSON, XML, and multipart form data.
- The file upload routing example used two separate `match` list items for `content-type` and `uri`. Istio treats separate match entries as OR conditions, not AND conditions. Moved `uri` into the same match object so both conditions must match.
- The Accept header routing example used case-sensitive regex patterns even though HTTP media type type/subtype tokens are case-insensitive. Updated the regex patterns to use `(?i)`.
- The Envoy Lua example used the deprecated `inlineCode` field. Updated it to `defaultSourceCode.inlineString`, which is the current Envoy Lua filter configuration style.
- The Lua normalization example used `headers():add` for `x-normalized-content-type`, which could append to an existing client-supplied header. Updated it to remove the header first and then use `replace`, so routing is based on the normalized Content-Type value.

## Review Notes
The Istio examples use `apiVersion: networking.istio.io/v1`, valid VirtualService fields, lowercase header match keys, and valid header operation placement. The YAML snippets parse successfully. EnvoyFilter remains a low-level extension mechanism and should be tested against the target Istio/Envoy version before production rollout.
