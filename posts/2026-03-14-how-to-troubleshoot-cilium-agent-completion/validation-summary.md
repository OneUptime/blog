# Validation Summary: How to Troubleshoot cilium-agent completion

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- cilium CLI
- cilium-dbg
- cilium-health
- Kubernetes
- kubectl
- Helm
- eBPF
- Prometheus and Grafana

## Sources Consulted
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/

## Issues Found
- The post title, description, introduction, and conclusion described shell completion, but the body covered cilium-agent troubleshooting. Updated the wording to describe cilium-agent troubleshooting accurately.
- The prerequisites specified Kubernetes v1.21+ and Cilium v1.14+. Current Cilium documentation lists supported Kubernetes versions by Cilium release rather than a generic v1.21+ requirement, so the prerequisite now refers to a Cilium-supported Kubernetes version.
- Several examples used the external `cilium` CLI for agent-local commands such as `identity list`, `metrics list`, `bpf lb list`, `policy get`, and `endpoint list/get`. These are `cilium-dbg` commands in current Cilium documentation, so the examples now run them via `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...`.
- The guide used `bpf tunnel list` for tunnel checks, but that command is not present in the current `cilium-dbg` command reference. Replaced it with supported `cilium-dbg node list` and `cilium-dbg bpf ipcache list` diagnostics.
- The high-memory Helm example used `labels.exclude`, which is not the documented Helm value. Updated it to use the documented `labels` Helm value with exclusion patterns.
- The verification section used `cilium health status`, which is not part of the current external `cilium` CLI reference. Updated it to run `cilium-health status` inside the Cilium DaemonSet.
- The troubleshooting section cited a fixed kernel version of 4.19 or later. Current Cilium documentation recommends checking the system requirements for the Cilium version, so the text now points readers to their version-specific kernel requirements.
- The init container example used `cilium-init`, which is not the current documented Cilium init container name. Updated the example to `mount-bpf-fs`.

## Review Notes
The guide is technically relevant and contains practical troubleshooting commands. Some diagnostics that use `kubectl exec ds/cilium` inspect one selected Cilium agent pod, so operators may need to run them on specific Cilium pods or nodes when investigating node-specific issues.
