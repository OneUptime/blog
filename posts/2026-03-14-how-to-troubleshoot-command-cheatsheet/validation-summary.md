# Validation Summary: How to Troubleshoot Command Cheatsheet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Kubernetes
- kubectl
- Helm
- eBPF
- Prometheus and Grafana

## Sources Consulted
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI `status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium CLI `sysdump` reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium limiting identity-relevant labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Helm `upgrade` reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- Several examples used agent-local commands as if they were standalone `cilium` CLI commands, including `cilium identity list`, `cilium metrics list`, `cilium bpf lb list`, `cilium policy get`, and `cilium endpoint list/get`. Updated them to run `cilium-dbg` inside the Cilium DaemonSet with `kubectl -n kube-system exec ds/cilium -- ...`, matching the official Cilium command reference and cheatsheet.
- The old `cilium bpf tunnel list` example is no longer present in the current command reference and redirects to BPF IP cache documentation. Replaced it with `cilium-dbg bpf ipcache list` and used `cilium-health status` for inter-node reachability checks.
- The verification command used `cilium health status`, but the documented health client is `cilium-health status`. Updated the command to run `cilium-health status` inside the Cilium DaemonSet.
- `cilium-dbg policy get` is documented but deprecated. Replaced those uses with `kubectl get networkpolicy,ciliumnetworkpolicy,ciliumclusterwidenetworkpolicy -A` for applied policy checks and `cilium-dbg policy selectors` for selector inspection.
- The Helm example used a non-existent `labels.exclude` value. Updated it to use the documented `labels` Helm value with exclusion patterns and added a Cilium DaemonSet rollout restart so the label-pattern change is picked up.
- The prerequisites claimed Kubernetes v1.21+ with Cilium v1.14+ as a broad requirement. Replaced it with a release-compatibility statement because supported Kubernetes versions vary by Cilium release.
- The troubleshooting section stated a fixed Linux kernel requirement of 4.19 or later. Replaced it with a release-specific kernel requirement note, because current Cilium documentation lists different base requirements.

## Review Notes
The remaining commands are operationally plausible, but cluster-specific label selectors such as `name=cilium-operator` may differ depending on installation method and Cilium release. Operators should verify selectors in their own cluster with `kubectl get pods -n kube-system --show-labels`.
