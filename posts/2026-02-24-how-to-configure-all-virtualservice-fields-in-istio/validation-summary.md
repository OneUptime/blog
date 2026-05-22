# Validation Summary: How to Configure All VirtualService Fields in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- VirtualService
- Traffic management
- Service mesh routing

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Envoy retry policy reference, linked from the Istio VirtualService retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on

## Issues Found
- The post claimed to cover every VirtualService field, but the current Istio API includes additional fields not covered in the article, such as `directResponse`, `mirrors`, route and match names, `statPrefix`, retry `backoff`, and `retryIgnorePreviousHosts`. I changed the title, description, introduction, and closing sentence to describe the post as covering common/useful fields instead of all fields.
- The full-resource examples used `networking.istio.io/v1beta1`. I updated them to `networking.istio.io/v1`, matching the current Istio reference examples.
- The HTTP match explanation said `ignoreUriCase` makes URI matching case-insensitive generally. I clarified that Istio applies it only to exact and prefix URI matches.
- The `withoutHeaders` explanation said it only matches when headers are not present. I corrected it to reflect Istio's inverse-match behavior: if a request header matches a `withoutHeaders` rule, the route does not match.
- The redirect example set both `port` and `derivePort`, which are mutually exclusive oneof fields in Istio. I removed the explicit `port` and noted the mutual exclusion.
- The rewrite example set both `uri` and `uriRegexRewrite`, while the post correctly stated they are mutually exclusive. I removed `uri` from that example.
- The mirroring example had invalid YAML indentation under `destination.host`. I fixed the `subset` indentation.

## Review Notes
The article is technically valid after the corrections above, but it is now scoped as a guide to common VirtualService fields rather than a complete API reference. All YAML snippets were parsed locally after the edits.
