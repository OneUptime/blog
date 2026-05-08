# Validation Summary: How to Validate Cilium Administrative API Enablement

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Cilium administrative API access flags
- Kubernetes
- CiliumNetworkPolicy
- Prometheus metrics
- Helm

## Sources Consulted
- Cilium Administrative API Enablement: https://docs.cilium.io/en/stable/configuration/api-restrictions.html
- Cilium API Reference: https://docs.cilium.io/en/stable/api.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg config get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get.html
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- cilium-health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/

## Issues Found
- The post did not actually validate Cilium administrative API enablement. I added node-local checks for `enable-cilium-api-server-access` and `enable-cilium-health-api-server-access` using `cilium-dbg config get`, matching the documented Cilium administrative API flags.
- Several examples used `cilium endpoint`, `cilium identity`, `cilium metrics`, and `cilium policy` commands as if they were part of the Kubernetes-facing Cilium CLI. Current Cilium documentation exposes these node-local agent API commands through `cilium-dbg`, so I changed the examples to execute `cilium-dbg` inside a Cilium agent pod with `kubectl exec`.
- The verification section used `cilium health status`, but the documented health client command is `cilium-health status`. I corrected the command and made sure the selected Cilium pod variable is defined before use.
- The troubleshooting guidance referenced `cilium bpf tunnel list`, which is not in the current documented `cilium-dbg bpf` command tree. I replaced it with the supported `cilium-health status` connectivity check.
- The prerequisites used a fixed Kubernetes version of v1.21+, which is not generally correct across current Cilium releases. I changed it to require a Kubernetes version supported by the deployed Cilium release.
- The troubleshooting section stated that kernel 4.19 or later was sufficient. Current stable Cilium system requirements document Linux kernel 5.10 or later, or an equivalent vendor kernel such as 4.18 on RHEL 8.10, so I updated the statement accordingly.

## Review Notes
The CiliumNetworkPolicy example is syntactically valid for `cilium.io/v2`, and the connectivity test commands and `cilium status --verbose` usage match the documented Cilium CLI. Metrics availability still depends on how Cilium was installed and which metrics were enabled.
