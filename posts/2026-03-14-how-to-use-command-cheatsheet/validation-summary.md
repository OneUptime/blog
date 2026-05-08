# Validation Summary: How to Use Command Cheatsheet

## Status
validated

## Post Type
Technical guide / CLI cheatsheet

## Technologies Covered
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Cilium health CLI (`cilium-health`)
- Kubernetes
- eBPF
- Helm
- Prometheus and Grafana
- Bash, `kubectl`, `jq`, and `python3`

## Sources Consulted
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Troubleshooting Guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium CLI `status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI `sysdump` reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg endpoint list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg bpf ct list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-health status` reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/

## Issues Found
- The post used agent-local commands such as `cilium endpoint list`, `cilium identity list`, `cilium policy get`, `cilium service list`, `cilium bpf ...`, and `cilium metrics list` as if they were Kubernetes-facing Cilium CLI commands. Current Cilium documentation exposes these as `cilium-dbg` commands, usually run inside a Cilium agent pod. Updated the examples to use `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg ...`.
- The post used `cilium health status`, which is not the documented command. Updated health checks to use `cilium-health status` from a Cilium agent pod.
- The BPF connection tracking example used `cilium bpf ct list global`; current `cilium-dbg bpf ct list` syntax is `cilium-dbg bpf ct list [cluster <identifier>] [flags]`. Removed the obsolete `global` argument and changed the command to run through `cilium-dbg`.
- The endpoint and service comments implied cluster-wide output from commands that inspect the selected Cilium agent. Updated wording to clarify that those examples inspect the selected agent.
- The prerequisites listed Kubernetes v1.21+ and Cilium v1.14+, which is outdated for current stable Cilium documentation. Updated the prerequisite to reference supported Kubernetes versions and noted the current Cilium 1.19 compatibility range.
- The troubleshooting note hard-coded Linux kernel 4.19 or later. Current Cilium system requirements are version-specific and list newer minimums for current releases, so the post now directs readers to the documented minimum for their Cilium version.
- The operator health check used `name=cilium-operator`; Cilium's own sysdump defaults use `io.cilium/app=operator`, so the selector was updated.

## Review Notes
The post remains a concise cheatsheet, but several examples run against one selected Cilium DaemonSet pod. For full cluster-wide endpoint inventory, a future revision could also show Kubernetes CRDs such as `kubectl get ciliumendpoints -A`.
