# Validation Summary: How to Troubleshoot cilium-agent

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- cilium-agent
- Cilium CLI and cilium-dbg
- Kubernetes
- Helm
- eBPF
- Prometheus/Grafana metrics

## Sources Consulted
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- cilium-health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium identity-relevant label documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/

## Issues Found
- The prerequisites used broad outdated version guidance (`Kubernetes v1.21+` and `Cilium v1.14+`). Updated this to require a supported Kubernetes/Cilium version pair and included the current Cilium 1.19 Kubernetes compatibility range.
- Several examples used cluster-level `cilium` CLI commands for node-local agent diagnostics (`identity`, `metrics`, `bpf`, `endpoint`, and `policy`). Updated those examples to run the supported `cilium-dbg` and `cilium-health` commands inside a selected Cilium pod.
- The Helm label exclusion example used an invalid `labels.exclude` value. Replaced it with the documented `labels` Helm value using space-separated exclusion patterns.
- The troubleshooting guidance referenced a fixed `cilium-init` container name and an outdated generic Linux kernel minimum. Updated it to use the deployment's actual init container name and current Cilium 1.19 kernel requirement language.
- The policy inspection example used deprecated `cilium-dbg policy get`. Replaced it with Kubernetes NetworkPolicy/CiliumNetworkPolicy resource inspection.
- Operator pod selection used `name=cilium-operator`; updated it to the current documented/default selector `io.cilium/app=operator`.
- The flowchart still referenced tunnel checks after the command examples were corrected. Updated it to refer to health and BPF checks.

## Review Notes
The corrected examples distinguish between the Kubernetes-facing Cilium CLI and node-local agent tools. Some diagnostics still depend on deployment mode and enabled features, so operators may need to adapt the exact metrics or BPF-map checks to their Cilium configuration.
