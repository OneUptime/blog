# Validation Summary: How to Prevent Health Checks from Failing After Enabling Calico Policies

## Status
validated

## Post Type
Guide / Troubleshooting prevention guide

## Technologies Covered
- Calico (NetworkPolicy, GlobalNetworkPolicy v3)
- Kubernetes (NetworkPolicy networking.k8s.io/v1)
- kubelet (liveness/readiness probes)
- kubectl (jsonpath queries)
- Bash scripting

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes Pod Lifecycle / Probes: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- kubernetes.io/metadata.name automatic label (Kubernetes 1.21+): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- kubectl jsonpath: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
No technical issues found.

The technical claims are accurate:
- Kubelet probes originate from the node (kubelet process), so the source IP is the node IP and cannot be matched by `podSelector`/`namespaceSelector` — only `ipBlock` covering the node CIDR works.
- Kubernetes NetworkPolicy YAML uses correct `apiVersion: networking.k8s.io/v1`, `policyTypes`, and `ingress` structure. Each `from` element under a separate list item is its own rule (OR semantics), which is what the template needs.
- The `kubernetes.io/metadata.name` label is automatically populated by Kubernetes 1.21+, so `namespaceSelector` matching on it is valid.
- Calico `GlobalNetworkPolicy` uses correct `apiVersion: projectcalico.org/v3`, with valid fields `order`, `selector: all()`, `types`, `ingress.action: Allow`, and `source.nets`.
- The kubectl jsonpath query is syntactically valid and correctly extracts node InternalIP addresses.
- The bash script is syntactically correct and uses appropriate kubectl flags.

## Review Notes
- The 10.0.0.0/8 example CIDR is intentionally broad; users should narrow this to the actual node subnet(s) in production. The post explicitly notes this is an example.
- In some Calico installations (e.g., eBPF dataplane with certain configurations) the apparent source IP of probe traffic may differ; for the default iptables dataplane the node IP applies and the advice in the post is correct.
- The post correctly notes that allowing the node CIDR is required when using `default-deny` ingress — this aligns with Calico's documented guidance.
- Consider mentioning `hostNetwork: true` pods (which use the node IP) as a related case where the same ipBlock rule applies — but this is an enhancement suggestion, not a correctness issue.
