# Validation Summary: How to Rewrite URIs Using Istio VirtualService

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio HTTPRewrite
- Kubernetes
- istioctl
- Envoy route rewriting

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy route components reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The prefix-stripping examples used matches such as `prefix: "/service-a"` with `rewrite.uri: "/"`, which would produce double slashes for subpaths such as `/service-a/health`. Updated those examples to include an exact match for the bare prefix and a trailing-slash prefix match for subpaths, matching Envoy's documented prefix rewrite behavior.
- The full Gateway example had the same prefix-stripping issue for `/users` and `/orders`. Updated those matches to handle both the exact path and trailing-slash subpaths correctly.
- The post said the original path is lost unless you add it as a header. Envoy documents that path rewrites populate `x-envoy-original-path`, so this was corrected.
- The post said regex-based rewriting is not supported in the `rewrite` field. Istio documents `rewrite.uriRegexRewrite` with capture-group support, so this was updated.

## Review Notes
- The examples use `networking.istio.io/v1beta1`, which remains valid, although current Istio documentation also shows `networking.istio.io/v1` examples.
- The `istioctl proxy-config routes deployment/istio-ingressgateway -n istio-system -o json` command form and flags are documented by Istio.
