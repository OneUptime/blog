# Validation Summary: How to Automate cilium-agent

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Cilium
- Cilium CLI
- cilium-dbg
- cilium-health
- Kubernetes
- kubectl
- Helm
- GitHub Actions
- Bash
- Cron
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium quick installation guide: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default.html
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- cilium-dbg config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- cilium-dbg BPF IPCache list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ipcache_list/
- cilium-health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Helm installation guide: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Helm repo add command reference: https://helm.sh/docs/helm/helm_repo_add/

## Issues Found
- The prerequisites listed Kubernetes v1.21+ and Cilium v1.14+, which is outdated for current Cilium documentation. Updated the wording to require a Kubernetes version supported by the installed Cilium release and gave the current Cilium 1.19 compatibility range as an example.
- The prerequisites said the `cilium` CLI should match the Cilium version, but the Cilium CLI is released separately and current documentation instructs users to install the latest CLI. Updated this to require a current Cilium CLI for cluster-level operations.
- Several examples used `cilium endpoint`, `cilium identity`, `cilium metrics`, `cilium config`, `cilium policy`, and `cilium bpf` as if they were current cluster-level Cilium CLI commands. Current documentation exposes those agent-local operations through `cilium-dbg`, so the examples now run `cilium-dbg` inside a Cilium agent pod with `kubectl exec`.
- The health-check examples used `cilium health status`, but the current command reference documents `cilium-health status`. Updated the examples to run `cilium-health status` from the agent pod.
- The GitHub Actions Helm validation step rendered `cilium/cilium` without first adding the Cilium Helm repository. Added `helm repo add cilium https://helm.cilium.io/` and `helm repo update`.
- The operator health check used the selector `name=cilium-operator`, but current Cilium tooling defaults to the operator selector `io.cilium/app=operator`. Updated the selector.
- The troubleshooting section recommended `cilium bpf tunnel list`, which is not present in the current command reference. Replaced it with `cilium-dbg bpf ipcache list` for inspecting remote endpoint and node mappings from an agent.
- The troubleshooting section recommended the deprecated `cilium-dbg policy get` path through `cilium policy get`. Updated the guidance to inspect Kubernetes `NetworkPolicy` and `CiliumNetworkPolicy` resources instead.
- The troubleshooting section gave a fixed minimum kernel version of 4.19, but current Cilium system requirements vary by release and document Linux kernel >= 5.10 or equivalent for Cilium 1.19. Updated the text to refer readers to the requirements for their installed Cilium release.

## Review Notes
- I could not run the Cilium, kubectl, or Helm examples locally because this workspace does not have those CLIs installed or a Kubernetes cluster configured. The review was performed against official Cilium and Helm documentation.
- The examples that use `kubectl exec` inspect one Cilium agent pod, so endpoint, identity, metrics, and BPF data are local to that selected node rather than cluster-wide.
