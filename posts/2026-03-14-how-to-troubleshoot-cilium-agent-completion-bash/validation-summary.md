# Validation Summary: How to Troubleshoot cilium-agent completion bash

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- cilium CLI
- cilium-dbg
- cilium-health
- Kubernetes
- kubectl
- Helm
- eBPF
- Bash

## Sources Consulted
- Cilium cilium-agent completion bash command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_bash/
- Cilium cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium identity-relevant labels guide: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The post title, description, introduction, and conclusion claimed to cover `cilium-agent completion bash`, but the body was a Cilium agent troubleshooting guide. Updated those references to describe cilium-agent troubleshooting accurately.
- The prerequisites used a stale generic Kubernetes/Cilium version pairing (`Kubernetes v1.21+` and `Cilium v1.14+`). Replaced it with guidance to use the Cilium version's supported Kubernetes compatibility matrix.
- Several node-local Cilium diagnostics were shown as `cilium` CLI commands (`cilium identity`, `cilium metrics`, `cilium bpf`, `cilium policy`, and `cilium endpoint`). Official documentation exposes these through `cilium-dbg`, so the examples now run `cilium-dbg` from the Cilium agent container with `kubectl exec`.
- The verification command `cilium health status` was invalid. Replaced it with `cilium-health status` run from the Cilium agent container.
- The Helm value `labels.exclude` is not the documented current Helm setting for identity-relevant label filtering. Replaced it with the documented `labels` value using exclusion patterns.
- The operator pod selector `name=cilium-operator` is not the current default selector used by Cilium tooling. Replaced it with `io.cilium/app=operator`.
- The troubleshooting note stated Linux kernel `4.19 or later` as a general requirement. Updated it to the current documented requirement of kernel 5.10 or later, or an equivalent vendor kernel such as RHEL 8.10.
- Some `kubectl logs` examples omitted the `cilium-agent` container where the intent was agent logs. Added `-c cilium-agent`.

## Review Notes
The post remains a general troubleshooting guide, not a Bash completion guide. The directory slug still includes `completion-bash`, but the reviewed README content now matches the actual technical material.
