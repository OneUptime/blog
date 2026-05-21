# Validation Summary: How to Set Up URL Rewriting in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio VirtualService
- Envoy routing and rewrite behavior
- istioctl
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tools documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Envoy HTTP route components reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The full VirtualService examples used `apiVersion: networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API version used by the official Istio documentation.
- The prefix-stripping example used `prefix: /service-a` with `rewrite.uri: /`, which can produce double-slash paths for subpaths. Added exact-match rules for `/service-a` and `/service-b`, changed subpath prefix matches to `/service-a/` and `/service-b/`, and clarified why the trailing slash matters.
- The second regex rewrite example claimed Istio could rewrite `/api/v2/users/list` into `/users/list?api_version=2`. Istio regex rewrites operate on the path portion of the URI, so this was changed to a path-only rewrite from `/api/v2/users/list` to `/v2/users/list`, with a note that query-parameter transformation needs application logic or another proxy feature.
- The verification command execed into the `istio-proxy` container for `curl`. Changed it to exec into an application container inside the mesh, which is the more reliable place to run curl-based request tests.
- The access-log explanation implied both original and rewritten paths would always appear in logs. Clarified that Envoy stores the pre-rewrite path in `x-envoy-original-path`, and visibility in logs depends on the configured access log format.
- The regex performance note warned to avoid backtracking. Since Istio uses RE2-style regex matching, revised this to a more accurate warning to keep regex patterns simple and avoid unnecessary complexity.

## Review Notes
The examples now align with the current Istio VirtualService schema and Envoy route rewrite behavior. The post intentionally stays focused on VirtualService rewrites; it does not cover newer Kubernetes Gateway API rewrite filters.
