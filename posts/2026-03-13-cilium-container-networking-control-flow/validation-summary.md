# Validation Summary: Cilium Container Networking Control Flow

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CNI
- eBPF
- CiliumEndpoint and CiliumIdentity CRDs
- Cilium IPAM
- Helm
- Prometheus metrics

## Sources Consulted
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium command reference for `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium eBPF introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/

## Issues Found
- Replaced in-agent `cilium` commands with `cilium-dbg` commands. Current Cilium documentation uses `cilium-dbg endpoint`, `cilium-dbg bpf`, `cilium-dbg ip`, and `cilium-dbg monitor` for local agent inspection inside Cilium pods.
- Corrected the veth setup wording from "Agent creates veth pair" to "CNI/agent configures the pod namespace and veth pair" to avoid overstating the agent-only role in CNI setup.
- Replaced the node debug image from `ubuntu` to `nicolaka/netshoot` for the `ip link show` example so the `ip` tooling is available.
- Replaced the runtime debug logging command with verified Helm values: `debug.enabled=true` and `debug.verbose=kvstore`.
- Changed the endpoint garbage collection example description. `operator.endpointGCInterval` controls CiliumEndpoint garbage collection, not endpoint regeneration speed.
- Replaced endpoint monitoring via `cilium monitor --type endpoint`/generic agent monitor examples with `kubectl get ciliumendpoints -A --watch` and endpoint logs. The monitor `--type` options do not include `endpoint`, and endpoint logs are the documented way to inspect endpoint-specific lifecycle messages.
- Updated endpoint-specific examples to exec into the Cilium pod running on the same node as the target pod, because Cilium endpoint IDs and endpoint lists are node-local.
- Replaced `cilium endpoint get ... | jq '.status.log[-10:]'` with `cilium-dbg endpoint log <endpoint-id>`, which is the documented command for endpoint logs.
- Updated the sequence diagram and conclusion to match the corrected commands and component responsibilities.

## Review Notes
Prometheus metrics on port 9962 require Cilium agent Prometheus metrics to be enabled with `prometheus.enabled=true`; the post's metric commands are valid for clusters where that option is enabled.
