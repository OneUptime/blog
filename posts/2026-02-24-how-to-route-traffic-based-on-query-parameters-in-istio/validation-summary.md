# Validation Summary: How to Route Traffic Based on Query Parameters in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes custom resources
- Envoy route matching
- istioctl proxy-config

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio v1 APIs announcement and supported API versions: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- Updated all Istio `VirtualService` and `DestinationRule` snippets from `networking.istio.io/v1beta1` to `networking.istio.io/v1`. Istio promoted these networking APIs to `v1` in Istio 1.22, and current official examples use `v1`.
- Clarified that `regex` uses RE2-style regular expressions, matching Istio's `StringMatch` documentation.
- Changed the DestinationRule prerequisite wording from defining "the subsets" to defining "any subsets you reference", because each named subset used in a route destination must exist in a corresponding DestinationRule.
- Corrected the URL encoding limitation. The post said query parameter values are matched after URL decoding, but Envoy's route matching documentation states query parameters are URL-encoded; encoded values such as `%20` should be matched in encoded form.

## Review Notes
- The `queryParams` field, exact/prefix/regex match forms, AND semantics within one match block, and OR semantics across match blocks are consistent with the Istio VirtualService reference.
- The `istioctl proxy-config routes deploy/my-app-v1 -o json` command shape is consistent with the official `proxy-config routes [<type>/]<name>` syntax, though an actual deployment name and namespace may vary by cluster.
- Envoy considers only the first value when a query parameter is repeated; the post does not cover repeated parameters, but this is a possible future caveat.
