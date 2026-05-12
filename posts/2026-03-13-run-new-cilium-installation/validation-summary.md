# Validation Summary: Run a New Cilium Installation

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Cilium (v1.14.0)
- Kubernetes
- Helm v3
- eBPF
- Hubble (observability)
- Prometheus
- kubectl

## Sources Consulted
- Cilium official documentation — https://docs.cilium.io/en/v1.14/
- Cilium installation guide — https://docs.cilium.io/en/v1.14/gettingstarted/k8s-install-default/
- Cilium kube-proxy replacement docs — https://docs.cilium.io/en/v1.14/network/kubernetes/kubeproxy-free/
- Cilium 1.14 release notes (kubeProxyReplacement type change from string to bool)
- Cilium CLI repository — https://github.com/cilium/cilium-cli (commands & flags)
- Cilium Helm chart values reference — https://docs.cilium.io/en/v1.14/helm-reference/
- Hubble CLI documentation — https://docs.cilium.io/en/v1.14/observability/hubble/
- kubectl debug node documentation — https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found

1. **Invalid `cilium preflight install` subcommand.** The post listed `cilium preflight install --config-path /tmp/cilium-check` as a pre-flight check. The cilium CLI has no `preflight` subcommand — `preflight` only exists as a Helm chart toggle used during upgrades, and the closely related agent commands (`cilium preflight migrate-identity`, etc.) live in the in-cluster agent binary, not in the user-facing CLI. Replaced with `cilium install --version 1.14.0 --dry-run-helm-values`, which is the supported way to preview the Helm values that would be applied alongside the existing `--dry-run` manifest preview.

2. **Broken `xargs` / `read` pipeline.** The Step 4 command `xargs -I{} sh -c 'echo {} | read ns name; kubectl delete pod $name -n $ns'` does not work in `/bin/sh` (dash) or default bash: piping to `read` runs it in a subshell, so `$ns` and `$name` are empty by the time `kubectl delete` runs, and the command effectively deletes nothing (or errors). Replaced with an `awk`-based equivalent that builds the `kubectl delete pod ... -n ...` lines directly and pipes them into `sh`, which produces the intended behavior.

## Review Notes
- `kubeProxyReplacement: true` (boolean) is correct for Cilium 1.14+. Prior to 1.14 the field was a string (`strict`/`partial`/`disabled`), so readers backporting this guide to older Cilium versions would need to translate the value.
- The "Linux kernel 5.4+" prerequisite is appropriate as a practical minimum for kube-proxy replacement and Cilium 1.14 feature support; the absolute minimum kernel for basic Cilium remains 4.19, but several advertised features in this post require 5.4+.
- `cilium connectivity test` is the correct command and is supported by recent cilium-cli versions for v1.14 clusters.
- `kubectl get nodes -o wide` already displays the KERNEL-VERSION column, so the additional `kubectl debug node` step is optional but not wrong — left as-is per the "fix only technical errors" rule.
- Cilium 1.14 reached end of life in early 2025; readers running new installs today should consider a current supported minor (1.15/1.16/1.17) instead. The commands and Helm values shown remain broadly compatible with newer versions, though some defaults (e.g., Gateway API, default Hubble UI auth) have changed.
