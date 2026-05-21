# Validation Summary: How to Set Up Header-Based Routing with Transformation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes kubectl
- istioctl proxy-config
- HTTP header matching and manipulation

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Envoy Lua filter example used the deprecated `inlineCode` field. I changed it to `defaultSourceCode.inlineString`, which matches the current Envoy Lua API and Istio EnvoyFilter examples.

## Review Notes
- `istioctl` and `kubectl` were not installed in the local environment, so CLI syntax was verified against official command references rather than local `--help` output.
- The Istio VirtualService and DestinationRule examples use current `networking.istio.io/v1` APIs. EnvoyFilter remains `networking.istio.io/v1alpha3` in Istio's reference examples.
