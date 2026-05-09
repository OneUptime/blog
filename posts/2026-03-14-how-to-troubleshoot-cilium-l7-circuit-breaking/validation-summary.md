# Validation Summary: Troubleshooting Cilium L7 Circuit Breaking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Envoy
- CiliumNetworkPolicy
- CiliumClusterwideEnvoyConfig and CiliumEnvoyConfig
- Helm
- Hubble

## Sources Consulted
- Cilium L7 Circuit Breaking documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-circuit-breaker/
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/latest/network/servicemesh/l7-traffic-management/
- Cilium L7 Load Balancing and URL re-writing documentation: https://docs.cilium.io/en/stable/network/servicemesh/envoy-traffic-management/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg envoy admin config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config/
- Cilium `cilium-dbg envoy admin metrics` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_metrics/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- The post implied that CiliumNetworkPolicy L7 rules configure circuit breaker thresholds. Official Cilium documentation configures circuit breaking through Envoy resources such as `CiliumClusterwideEnvoyConfig`; L7 policy rules send matching traffic through Envoy but do not set those thresholds. I clarified this distinction throughout the post.
- The prerequisites only mentioned `l7Proxy=true`. Direct Envoy resource management also requires `envoyConfig.enabled=true`, so I added that prerequisite and included it in the Helm upgrade example.
- The diagnostics used `cilium bpf proxy list` and direct `curl localhost:9901/stats` commands as if they showed circuit breaker configuration and stats. Current Cilium documentation exposes Envoy admin inspection through `cilium-dbg envoy admin config` and `cilium-dbg envoy admin metrics`, so I replaced the commands with those documented forms.
- The Envoy stats examples used incomplete or inaccurate stat names such as `rq_pending` and `rq_retry`. Envoy documents circuit breaker gauges such as `rq_pending_open`, `rq_open`, and `rq_retry_open`, plus overflow counters such as `upstream_cx_overflow`, `upstream_rq_pending_overflow`, and `upstream_rq_active_overflow`; I updated the examples accordingly.
- The Envoy configuration example used a namespaced `CiliumEnvoyConfig` shape without the core Envoy cluster fields shown in Cilium's circuit breaker example. I changed it to `CiliumClusterwideEnvoyConfig` and added `connect_timeout`, `lb_policy`, `type: EDS`, and `priority: "DEFAULT"` to match the documented pattern.
- The troubleshooting flow and final notes assumed L7 policy was the only way to put traffic through Envoy. I updated them to include Cilium Ingress, Gateway API, L7 load balancing, and other Envoy traffic management configurations.

## Review Notes
The post is technically relevant and validated after corrections. Cilium's official circuit-breaking page is currently in the latest documentation set and uses `HEAD` example manifests, so users should pin example URLs to their installed Cilium version before applying them in production.
