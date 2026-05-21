# Validation Summary: How to Use Layer 7 Features in Istio Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Istio VirtualService
- Istio DestinationRule subsets
- Istio AuthorizationPolicy
- Kubernetes Gateway API
- Prometheus metrics and PromQL

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio configure waypoint proxies: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio use Layer 7 features: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ambient authorization policies guide: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy router retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The description claimed the post covered rate limiting, but the post does not include a rate limiting example. Removed "rate limiting" from the description.
- The waypoint verification output used `bookinfo-waypoint`, but `istioctl waypoint apply -n bookinfo --enroll-namespace` creates the default waypoint named `waypoint` unless `--name` is supplied. Updated the sample output.
- The post said all L7 features were available for services in the namespace. Clarified that services are enrolled to use the waypoint for L7 processing, matching Istio's waypoint enrollment model.
- The VirtualService examples used subsets without noting that matching DestinationRule subsets are required. Added a short caveat before the routing examples.
- Istio documents VirtualService usage with ambient mode as alpha. Added a short caveat before the VirtualService examples.
- The header manipulation example attempted to set `x-request-id` to `%REQ(X-REQUEST-ID)%`, which is an Envoy access-log formatter expression rather than a documented VirtualService header operation value. Removed that header assignment.
- The CORS example used `prefix: "https://*.example.com"`, which would be treated as a literal prefix rather than a wildcard domain pattern. Replaced it with a regex match.

## Review Notes
The examples are valid as Istio API examples, but current Istio ambient documentation recommends Gateway API route resources such as HTTPRoute for waypoint traffic routing and notes that VirtualService support in ambient is alpha. Future revisions could convert the routing examples to Gateway API resources.
