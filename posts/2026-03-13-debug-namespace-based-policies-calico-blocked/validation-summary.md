# Validation Summary: How to Debug Calico Namespace-Based Policies When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source network policy
- Kubernetes namespaces and labels
- `calicoctl`
- `kubectl`
- Linux policy logging through journald/syslog and Calico eBPF trace logging

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The policy-order example said the output was sorted by order and piped `calicoctl get globalnetworkpolicies -o wide` through `sort -t'|' -k3 -n`. Calico documents `wide` output as a space-aligned table, not pipe-delimited output, and the global policy `ORDER` column is the second column in the documented output. I changed the commands to the documented singular resource names and clarified that the reader should compare the `ORDER` column, with lower order values evaluated first.
- The log-checking command only showed a journald path and used a case-sensitive `CALICO` grep. Calico documents journald/syslog-style locations for the standard Linux dataplane, with lowercase packet log prefixes in examples, and `bpftool prog tracelog` for eBPF mode. I made the grep case-insensitive and added the eBPF trace-log command as a caveat.

## Review Notes
- The Calico `namespaceSelector` explanation is accurate: rule-level `namespaceSelector` matches namespace labels, not pod labels.
- The `NetworkPolicy` YAML uses valid `projectcalico.org/v3` fields for a temporary ingress log policy.
- The `kubectl get namespaces --show-labels`, `kubectl label namespace`, and `kubectl exec` examples use valid kubectl command forms.
