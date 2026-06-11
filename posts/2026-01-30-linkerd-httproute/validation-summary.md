# Validation Summary: How to Build Linkerd HTTPRoute

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Linkerd
- Kubernetes
- Gateway API HTTPRoute
- Linkerd policy API
- Linkerd Viz CLI
- YAML configuration

## Sources Consulted
- Linkerd HTTPRoute reference: https://linkerd.io/2-edge/reference/httproute/
- Linkerd dynamic request routing guide: https://linkerd.io/2-edge/tasks/configuring-dynamic-request-routing/
- Linkerd telemetry and monitoring documentation: https://linkerd.io/2-edge/features/telemetry/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-header-modifier/
- Gateway API HTTPRoute API source/reference: https://github.com/kubernetes-sigs/gateway-api/blob/main/apis/v1/httproute_types.go

## Issues Found
- The introduction and key component description implied Linkerd HTTPRoutes attach to either a Service or Gateway. Linkerd's documented mesh behavior uses Service parentRefs for outbound routing and Server parentRefs for inbound per-route authorization policy, so the wording was corrected.
- The post did not mention that Linkerd's older `policy.linkerd.io` HTTPRoute CRD is no longer the actively maintained direction. Added a note that the examples use that API and that current Linkerd versions also support the canonical Gateway API HTTPRoute for many use cases.
- The route-selection diagram claimed unmatched traffic returns `404 Not Found`. For Service-attached Linkerd HTTPRoutes, a route without a matching fallback should use default Service routing rather than a synthetic 404, so the diagram was corrected.
- The route-selection section implied pure rule order evaluation. Gateway API match precedence applies when multiple routes or rules could match, with list order only as a tie-breaker in certain cases, so the wording was adjusted.
- The traffic mirroring example used `RequestMirror`, which is a Gateway API filter but is not listed in Linkerd's `policy.linkerd.io` HTTPRoute filter support. Removed that unsupported section.
- The header modifier examples used template-like values such as `${request.id}`, `${timestamp}`, and `${latency_ms}`. Gateway API/Linkerd header modifier values are literal configured strings, so those values were removed or replaced with static values.
- The backend routing section omitted Linkerd's ServiceProfile precedence caveat. Added a warning that ServiceProfiles take precedence over overlapping outbound HTTPRoute configuration for the same Service.
- The traffic-flow diagram represented HTTPRoute as a runtime hop after an ingress controller. Updated the labels to show Service-attached HTTPRoute processing in a meshed client or ingress proxy's outbound route processing.
- The troubleshooting section used `linkerd viz routes` as though it verified HTTPRoute behavior directly. Linkerd documents `viz routes` around ServiceProfile route metrics, while `viz stat` supports `httproute` resources, so the commands were corrected.

## Review Notes
The YAML examples remain scoped to Linkerd's `policy.linkerd.io` HTTPRoute API. Future updates could migrate the examples to canonical `gateway.networking.k8s.io/v1` HTTPRoutes where the target Linkerd version and supported feature set allow it.
