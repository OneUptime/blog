# Validation Summary: How to View Envoy Listener Configuration with istioctl

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- Envoy listeners and filter chains
- istioctl proxy-config
- Kubernetes Services and Pods
- Istio Sidecar resources

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Application Requirements / ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy listener configuration reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listeners
- Envoy HTTP Inspector listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/http_inspector
- Envoy listener proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described Istio as creating per-port listeners for each service. Istio's documented behavior is more specific: outbound HTTP commonly uses wildcard listeners per HTTP port, while non-HTTP TCP/TLS traffic uses virtual listeners per service IP and port. Updated the wording to avoid overgeneralizing the listener model.
- The "Per-Service Listeners" section grouped wildcard HTTP ports and service-IP TCP/TLS listeners together imprecisely. Updated the heading and introduction to distinguish per-port HTTP listeners from service-IP TCP/TLS listeners.
- The JSON example used `{ ... }` and `[ ... ]` inside a fenced `json` block, which is not valid JSON. Replaced those placeholders with `{}` and `[]`.
- The list of valid Istio service-port protocol prefixes included `udp`. Istio protocol-selection documentation states non-TCP protocols such as UDP are not proxied by the sidecar, and the supported protocol list does not include `udp`. Removed `udp` from the prefix list.

## Review Notes
The commands and flags for `istioctl proxy-config listeners`, including the `pc` alias, `--port`, and `-o json`, match the current Istio command reference. The sample listener output is illustrative and may vary by Istio version, mesh mode, traffic policy, and workload configuration.
