# Validation Summary: How to Validate Deploy 25 more deployments on each namespace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- kubectl
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/index.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The prerequisites implied that any Kubernetes v1.21+ cluster with Cilium v1.14+ was valid. Cilium support is version-specific, so the prerequisite was changed to require a Kubernetes version supported by the installed Cilium release.
- Several examples used node-local Cilium agent commands as if they were standalone Cilium CLI commands, including `cilium endpoint list`, `cilium identity list`, `cilium metrics list`, `cilium policy get`, and `cilium endpoint get`. These were changed to execute `cilium-dbg` inside a Cilium agent pod.
- The verification section used `cilium health status`, but current Cilium documentation exposes this as `cilium-health status`. The example was changed to run `cilium-health status --verbose` inside a Cilium pod.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not present in the current Cilium command references. It was replaced with `cilium-dbg bpf ipcache list` for checking inter-node routing state.
- The agent startup troubleshooting note stated that kernel version 4.19 or later is sufficient. Current Cilium system requirements are release-specific, so this was changed to direct readers to the kernel requirements for their Cilium version.
- The init-container log example used a fixed `cilium-init` container name. Cilium init container names can vary by installation and version, so this was changed to a placeholder for the failing init container.

## Review Notes
The CiliumNetworkPolicy example is syntactically valid and uses the documented `endpointSelector`, `fromEndpoints`, and `toPorts` fields. The `kubectl run`, `kubectl expose`, `cilium config view`, `cilium status --verbose`, `cilium connectivity test`, and `cilium sysdump --output-filename` examples match current command references.
