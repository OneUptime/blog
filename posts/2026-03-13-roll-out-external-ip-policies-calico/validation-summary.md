# Validation Summary: How to Roll Out External IP Policies Safely in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico GlobalNetworkPolicy and NetworkPolicy (`projectcalico.org/v3`)
- `calicoctl` CLI
- `kubectl` CLI
- Mermaid (for the architecture diagram)

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- kubectl events reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#events
- kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

Items specifically verified:
- `projectcalico.org/v3` is the correct, current API group/version for Calico's `GlobalNetworkPolicy` and `NetworkPolicy` resources.
- `calicoctl get networkpolicies --all-namespaces` is valid: `calicoctl get` supports the `--all-namespaces` flag for namespaced resources like `networkpolicy`.
- `calicoctl apply -f <file>` is the documented invocation for applying manifests.
- `calicoctl apply -f <file> -n <namespace>` — `-n` is the documented short form of `--namespace` for calicoctl commands, used to scope the apply to a namespace (overriding `metadata.namespace`).
- `kubectl get events --all-namespaces`, `kubectl get events -n <namespace>`, and `kubectl exec -n <ns> <pod> -- <cmd>` are all syntactically correct.
- The Mermaid `flowchart TD` block uses valid node/edge syntax (`-->|label|`, `{rhombus}`, `[rectangle]`). The `\n` line break inside a node label is supported by current Mermaid releases.

## Review Notes
- The post is brief and presents a phased rollout *workflow* rather than a concrete External IP policy YAML manifest. It would be stronger if it showed an example policy using `source.nets` / `destination.nets` to actually match external IPs, but the absence is a scope/content gap, not a technical inaccuracy.
- Several sentences have awkward phrasing (e.g., "External IP Policies in Calico provides", "techniques for roll out External IP"). These are grammatical/stylistic issues, not technical errors, and were left unchanged per the review guidelines.
- Calico v3.26+ is a reasonable baseline; the resources and CLI flags shown here are stable across recent v3 releases (v3.27, v3.28, v3.29, v3.30).
- `kubectl get events` reflects Kubernetes object events, not in-line Calico policy enforcement decisions — for visibility into policy drops, operators should rely on Calico flow logs or eBPF/iptables counters in addition to events. Worth a follow-up enhancement but not an inaccuracy.
