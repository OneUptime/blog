# Validation Summary: How to Get Help with Cilium: A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Hubble
- Cilium CLI
- kubectl

## Sources Consulted
- Cilium command reference for `cilium`, `cilium status`, `cilium connectivity test`, `cilium sysdump`, and `cilium version`: https://docs.cilium.io/en/stable/cmdref/
- Cilium command reference for `cilium-dbg`, `cilium-dbg endpoint get`, `cilium-dbg endpoint list`, `cilium-dbg monitor`, and `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium quick installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Slack/community documentation: https://docs.cilium.io/en/stable/community/community/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The in-pod diagnostic commands used `cilium` for agent-side debugging commands. Current Cilium documentation exposes these commands through `cilium-dbg`, so the endpoint, monitor, and BPF policy examples were updated to use `cilium-dbg`.
- The `cilium policy trace` example is not present in the current Cilium command reference. It was replaced with `cilium-dbg endpoint get pod-name:<ns>:<pod>`, which is a documented way to inspect endpoint policy details.
- The policy troubleshooting URL was updated from the broader Kubernetes policy page to the current Cilium policy troubleshooting page.
- The installation documentation URL was updated from an outdated generic `/installation/` path to the current quick installation guide.
- The Slack join URL was updated to the current `https://slack.cilium.io` link used by the official Cilium documentation.
- The Slack channel list included `#installation`, which is not listed in the current Cilium Slack channel documentation. It was replaced with the documented `#kubernetes` channel.
- The conclusion was updated to reference the corrected diagnostic commands.

## Review Notes
The Cilium CLI commands `cilium status`, `cilium status --verbose`, `cilium connectivity test`, `cilium sysdump`, `cilium sysdump --quick`, `cilium sysdump --output-filename`, and `cilium version` are documented and current. The Kubernetes `kubectl logs` and `kubectl exec` command shapes are also supported by the current official kubectl reference.
