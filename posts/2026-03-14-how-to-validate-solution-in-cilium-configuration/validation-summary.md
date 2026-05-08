# Validation Summary: How to Validate Solution in Cilium configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- CiliumNetworkPolicy
- eBPF
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium policy language examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The prerequisites hard-coded `Kubernetes v1.21+` with `Cilium v1.14+`, which is not an accurate general compatibility statement for current Cilium releases. Changed it to require a Kubernetes version supported by the selected Cilium release.
- Several examples used agent-local commands such as `cilium endpoint list`, `cilium identity list`, and `cilium metrics list` as if they were top-level Cilium Kubernetes CLI commands. Updated them to run `cilium-dbg` inside the Cilium DaemonSet with `kubectl exec`.
- The verification step used the invalid `cilium health status` command. Updated it to run `cilium-health status` from a Cilium agent pod.
- Troubleshooting examples used `cilium policy get` and `cilium bpf tunnel list` from the wrong command context. Updated policy checks to use Kubernetes resources where appropriate and tunnel inspection to use `cilium-dbg` inside a Cilium agent pod.
- The troubleshooting section hard-coded a kernel minimum of 4.19. Current Cilium system requirements vary by release and distribution, so this was changed to require that nodes meet the system requirements for the selected Cilium release.
- The endpoint count command included the table header in the count. Added `--no-headers` to make the count reflect endpoints.

## Review Notes
The CiliumNetworkPolicy manifest uses the current `cilium.io/v2` API and valid `endpointSelector`, `fromEndpoints`, and `toPorts` syntax. The connectivity test, status, config view, and sysdump commands are current Cilium CLI commands. Some diagnostics are node-local by nature; running them through one Cilium DaemonSet pod checks that selected node, not every node in the cluster.
