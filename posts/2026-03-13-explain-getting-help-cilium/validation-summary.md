# Validation Summary: Explaining the Cilium Help Ecosystem: Channels, Resources, and When to Use Each

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Cilium CLI
- kubectl

## Sources Consulted
- Cilium Getting Help documentation: https://docs.cilium.io/en/stable/gettingstarted/gettinghelp/
- Cilium `cilium version` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Kubernetes networking documentation: https://docs.cilium.io/en/stable/network/kubernetes/
- Cilium quick installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The Slack URL in the diagram used `cilium.io/slack`; the official Cilium documentation points users to `slack.cilium.io`, so the diagram was updated.
- The post described enterprise support as "through Isovalent (the company behind Cilium)" and the diagram labeled production outages as "Enterprise Support - Isovalent." Cilium is a CNCF project, and the official help documentation refers more generally to enterprise-ready supported distributions. The wording was changed to "Commercial support, such as Isovalent Enterprise for Cilium" and "Commercial Support" to avoid overstating project ownership while preserving the intended guidance.
- The in-pod diagnostic commands used `cilium status` and `cilium endpoint list`. The current Cilium agent CLI documented for interacting with the local agent is `cilium-dbg`, so these were changed to `cilium-dbg status` and `cilium-dbg endpoint list`.
- The bug-report example used `kubectl version --short`, but `--short` is not present in the current generated Kubernetes `kubectl version` reference. It was changed to `kubectl version`.
- The documentation search section linked to `https://docs.cilium.io/en/stable/installation/`, which returned 404. It was changed to the current quick installation page at `https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/`.

## Review Notes
The remaining commands and links are technically valid for current Cilium and Kubernetes documentation. The post is intentionally high-level, so support-response-time claims were treated as qualitative community guidance rather than command-level facts.
