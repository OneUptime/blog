# Validation Summary: Configuring Cilium L7 Path Translation for HTTP Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEnvoyConfig
- Envoy v3 xDS resources
- Hubble
- Helm
- kubectl

## Sources Consulted
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/stable/network/servicemesh/l7-traffic-management/
- Cilium L7 Load Balancing and URL re-writing documentation: https://docs.cilium.io/en/stable/network/servicemesh/envoy-traffic-management/
- Cilium L7 Path Translation documentation: https://docs.cilium.io/en/stable/network/servicemesh/envoy-custom-listener/
- Cilium CiliumEnvoyConfig CRD schema: https://raw.githubusercontent.com/cilium/cilium/1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumenvoyconfigs.yaml
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium cilium-dbg Envoy admin config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config/
- Envoy HTTP route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The prerequisites and Helm command enabled only `l7Proxy=true`, which is for Layer 7 network policy and is already enabled by default in current Cilium Helm values. Cilium's L7 traffic-management documentation requires `envoyConfig.enabled=true` for CiliumEnvoyConfig resources and `kubeProxyReplacement=true`, so the prerequisite and command were updated.
- The CiliumEnvoyConfig examples defined only a RouteConfiguration. Cilium's CRD schema and official examples require a Listener resource to receive redirected service traffic, and an EDS Cluster resource for the service backend. Both YAML examples were updated to include listener, HTTP connection manager, route, and cluster resources.
- The service entries did not name the Envoy listener. The examples now set `listener` explicitly so service traffic is redirected to the intended listener.
- Direct east-west CiliumEnvoyConfig usage should set `cec.cilium.io/use-original-source-address: "false"` to avoid original source address connection-pool collisions. The annotation was added to both examples.
- The regex rewrite example used a double-quoted YAML string containing `\1`, which is not valid YAML escaping. It was changed to a single-quoted string, and the regex matcher was updated to use Envoy's documented `google_re2` matcher shape with anchored patterns.
- The Envoy route verification command used a direct `curl localhost:9901/config_dump` pattern that may not be available in Cilium's Envoy deployment. It was replaced with the documented `cilium-dbg envoy admin config routes` command.
- Troubleshooting referred to "Envoy admin logs"; the Cilium documentation says Cilium agent logs are where CiliumEnvoyConfig parsing and installation errors appear. The troubleshooting note was corrected.
- The conclusion implied Hubble alone confirms rewritten paths. The verification guidance was adjusted to include backend logs and Envoy configuration as well as Hubble flow observation.

## Review Notes
The corrected examples follow the Cilium 1.19 stable documentation and Envoy v3 route API. CiliumEnvoyConfig resources receive minimal Kubernetes-side validation, so runtime verification should include Cilium agent logs and Envoy config inspection.
