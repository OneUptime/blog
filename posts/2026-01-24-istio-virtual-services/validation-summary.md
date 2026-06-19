# Validation Summary: How to Configure Istio Virtual Services

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio DestinationRule
- Kubernetes
- Envoy retry policies
- istioctl
- pilot-agent

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy router retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on

## Issues Found
- The Istio manifests used `apiVersion: networking.istio.io/v1beta1`. Istio promoted VirtualService, Gateway, DestinationRule, and related networking APIs to `networking.istio.io/v1` in Istio 1.22, and current official reference examples use `v1`. Updated all Istio manifest snippets to use `apiVersion: networking.istio.io/v1`.

## Review Notes
- The remaining VirtualService fields and examples match the current Istio API: `hosts`, `gateways`, `http.match`, URI matching, header matching, `rewrite.uri`, destination subsets, route weights, fault injection, `timeout`, `retries`, `mirror`, and `mirrorPercentage` are valid.
- The debugging commands are consistent with the current `istioctl` and `pilot-agent` command references. `istioctl` was not installed in the local environment, so command validation was performed against the official command reference.
- The post uses short Kubernetes service names in several examples. This is valid, but Istio resolves short names relative to the namespace of the VirtualService or DestinationRule; fully qualified service names are safer in multi-namespace examples.
