# Validation Summary: Troubleshooting Cilium L7 Path Translation Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumEnvoyConfig
- Kubernetes
- Envoy
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium L7-Aware Traffic Management: https://docs.cilium.io/en/stable/network/servicemesh/l7-traffic-management/
- Cilium L7 Load Balancing and URL re-writing: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-management/
- Cilium cilium-dbg envoy admin config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Envoy route matching documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/route_matching
- Envoy HTTP route components documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy regex matcher documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/regex.proto

## Issues Found
- The Envoy config inspection command used `curl localhost:9901/config_dump`, which is not the documented Cilium way to access the Envoy admin interface. Updated it to use `cilium-dbg envoy admin config routes` from the Cilium agent container.
- The log commands did not specify the Cilium agent container and only searched for route text. Updated them to target `-c cilium-agent` and include Envoy-related log messages.
- The post suggested checking `.status` on CiliumEnvoyConfig objects for rejected configurations. Cilium documentation notes that CiliumEnvoyConfig has minimal feedback and Envoy parsing or installation failures must be checked in Cilium agent logs. Updated the command accordingly.
- The example CiliumEnvoyConfig only defined a RouteConfiguration, which would not be sufficient as a standalone Envoy traffic-management example. Updated it to include a Listener, RouteConfiguration, and EDS Cluster, following Cilium's documented URL rewrite example structure.
- Added `cec.cilium.io/use-original-source-address: "false"` to the direct CiliumEnvoyConfig example for east-west traffic, matching Cilium guidance for directly managed CEC resources.

## Review Notes
The Hubble commands are syntactically consistent with Cilium's documented `hubble observe --protocol http` usage. The JSON `jq` filter assumes L7 HTTP visibility is enabled and that flows include HTTP fields, which is correct for matching L7-observed traffic.
