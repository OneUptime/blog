# Validation Summary: Configuring Cilium L7 Traffic Shifting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumEnvoyConfig
- Envoy HTTP routing and weighted clusters
- Kubernetes Deployments and Services
- kubectl
- Hubble

## Sources Consulted
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/stable/network/servicemesh/l7-traffic-management/
- Cilium L7 Traffic Shifting documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-shifting/
- Cilium traffic shifting example manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes/servicemesh/envoy/envoy-helloworld-v1-90-v2-10.yaml
- Cilium backend service example manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes/servicemesh/envoy/helloworld-service-v1-v2.yaml
- Cilium client and helloworld example manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes/servicemesh/envoy/client-helloworld.yaml
- Envoy weighted cluster route documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The prerequisites were too vague and referenced Cilium v1.14+. Current Cilium L7 traffic management documentation requires kube-proxy replacement and Envoy config support, and the direct `CiliumEnvoyConfig` annotation used here is documented in current Cilium v1.19, so the prerequisites were updated.
- The post described "Kubernetes-native traffic splitting" as L4. Kubernetes Services provide ordinary service load balancing rather than weighted canary traffic splitting, so the comparison was corrected.
- The deployment example created only Pods and no Kubernetes Services. Cilium's documented traffic-shifting pattern routes from one frontend Service to version-specific backend Services, so frontend and backend Services were added.
- The original sample used the same nginx image for both versions, making verification unable to distinguish v1 from v2 responses. The workloads were changed to the versioned helloworld images used in Cilium's official example.
- The `CiliumEnvoyConfig` snippet only defined a `RouteConfiguration`. Cilium's traffic shifting example also requires `backendServices`, an Envoy listener, and EDS cluster resources, so those were added.
- The direct east-west `CiliumEnvoyConfig` was missing `cec.cilium.io/use-original-source-address: "false"`, which Cilium documents for direct CECs intended to manage east-west traffic.
- The gradual migration command used a merge patch that would replace the full `resources` array with an incomplete route-only configuration. It was changed to `kubectl edit` with instructions to update the route weights.
- The verification commands referenced a `client` deployment that was never created and curled the wrong port/path for the corrected sample application. A client deployment was added and the curl target was updated to `http://backend:5000/hello`.
- The Hubble `jq` command counted every destination label, not just version labels. It now filters for labels beginning with `version=`.
- The troubleshooting note said an L7 policy was required for the CEC to apply. For this Cilium traffic management path, Envoy config support and Cilium agent logs are the relevant checks, so the note was corrected.

## Review Notes
The YAML snippets were parsed locally with Python's YAML parser. `kubectl` and `hubble` were not installed in the review environment, so CLI validation was performed against official documentation rather than local command output.
