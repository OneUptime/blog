# Validation Summary: How to Diagnose Scale each deployment to 200 replicas (50000 pods in total)

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF datapath diagnostics
- kubectl
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI Command Reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium `cilium status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Troubleshooting Guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#describe

## Issues Found
- Several examples used agent-local Cilium debug commands as top-level `cilium` CLI commands, such as `cilium endpoint list`, `cilium identity list`, `cilium bpf ct list`, `cilium bpf lb list`, `cilium policy get`, and `cilium metrics list`. Updated those examples to run `cilium-dbg` inside a Cilium agent pod with `kubectl -n kube-system exec ds/cilium -c cilium-agent -- ...`, matching current Cilium documentation.
- `cilium health status` was not the correct command form for node-to-node health diagnostics. Updated it to run `cilium-health status` inside the Cilium agent pod.
- The prerequisites named Kubernetes v1.21+ and Cilium v1.14+, which are outdated as blanket guidance for a 2026 production troubleshooting guide. Replaced this with a requirement to use a supported Kubernetes/Cilium version combination.
- The troubleshooting section stated that kernel 4.19 or later was sufficient. Updated it to Cilium's current documented baseline of Linux kernel 5.10 or later, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel.
- The init container log example referenced a fixed `cilium-init` container name. Updated it to use the actual init container name from the deployed pod, since current Cilium deployments use init container names such as `config`, `mount-cgroup`, `mount-bpf-fs`, `clean-cilium-state`, and `install-cni-binaries` depending on configuration.

## Review Notes
The guide is now technically valid as a practical diagnostic checklist. The `kubectl exec ds/cilium ...` examples inspect one selected Cilium agent pod; for full multi-node analysis, operators should repeat agent-local commands against the relevant Cilium pod on each node or use `cilium sysdump` for cluster-wide collection.
