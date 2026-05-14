# Validation Summary: Cilium Proxy Injection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Envoy
- eBPF
- Helm

## Sources Consulted
- Cilium Proxy Injection documentation: https://docs.cilium.io/en/latest/security/network/proxy/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Helm Reference for `envoy.*` values: https://docs.cilium.io/en/stable/helm-reference/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg envoy admin config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config/
- Cilium `cilium-dbg envoy admin listeners` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/
- Cilium `cilium-dbg envoy admin metrics` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_metrics/
- Cilium Helm template for `cilium-envoy` labels: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/templates/cilium-envoy/daemonset.yaml

## Issues Found
- The introduction implied Istio and Linkerd both inject Envoy sidecars. Linkerd does not use Envoy as its sidecar proxy, so the wording was changed to refer generally to sidecar proxy containers.
- The introduction listed gRPC as a Cilium L7 policy protocol alongside HTTP and Kafka. Current Cilium L7 policy documentation lists HTTP, Kafka, and DNS-specific rules, so the text was changed to HTTP, DNS, and Kafka.
- The post described the per-node Envoy only as managed by the Cilium DaemonSet. Current Cilium supports Envoy either embedded in the Cilium agent pod or as the dedicated `cilium-envoy` DaemonSet, so the explanation was updated.
- The prerequisites named the external `cilium` CLI, but the corrected inspection commands use `cilium-dbg` inside the Cilium agent pod. The prerequisite was updated accordingly.
- The pod label selector for `cilium-envoy` was changed from `app.kubernetes.io/name=cilium-envoy` to `k8s-app=cilium-envoy`, matching the DaemonSet selector in Cilium's Helm chart.
- The verification commands used unsupported or outdated `cilium endpoint` and `cilium proxy list` commands. They were replaced with `kubectl exec ... cilium-dbg endpoint ...` and `cilium-dbg envoy admin listeners`.
- The L7 visibility annotation examples used `policy.cilium.io/proxy-visibility`, which is no longer the supported approach in current Cilium documentation. They were replaced with a CiliumNetworkPolicy example using HTTP L7 rules.
- The Envoy admin examples assumed raw port-forward access to port 9901. Current Helm defaults keep the debug admin interface disabled unless configured, and Cilium provides `cilium-dbg envoy admin` commands, so those examples were replaced.
- The metrics example used a raw `/stats/prometheus` request against port 9901. It was replaced with `cilium-dbg envoy admin metrics --filter envoy_http`.

## Review Notes
The corrected CiliumNetworkPolicy example both enables L7 visibility and enforces policy, which matches Cilium's documented behavior. Future revisions could add a warning that L7 visibility policies may expose sensitive HTTP data in Hubble unless redaction is configured.
