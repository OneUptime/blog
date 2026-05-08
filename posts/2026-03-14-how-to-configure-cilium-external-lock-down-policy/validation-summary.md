# Validation Summary: Configuring Cilium External Lock-Down Network Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes
- kubectl
- DNS-based egress policy
- CIDR-based egress policy

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium DNS-based Policies: https://docs.cilium.io/en/stable/security/dns/
- Cilium Layer 3 Policies: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Kubernetes Network Policy: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium AWS Metadata / Security Group Filtering: https://docs.cilium.io/en/latest/security/aws/
- Kubernetes kubectl exec Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The default deny egress example used `egress: []`. Cilium's documented default-deny CiliumNetworkPolicy example uses an egress section with an empty rule (`- {}`) to select endpoints without whitelisting any peers, so the snippet was updated to that form.
- The DNS allow policy only allowed L3/L4 traffic to kube-dns. Cilium `toFQDNs` policy relies on DNS proxy inspection to learn DNS answers, so the DNS rule was updated to use `protocol: ANY` with `rules.dns.matchPattern: "*"` as shown in the official Cilium DNS policy examples.
- The introduction claimed Cilium can restrict egress by AWS/Azure security groups. The official Cilium cloud metadata security group policy documentation covers AWS security groups, so the claim was narrowed to AWS security groups.
- The cluster-wide policy allowed RFC1918 CIDRs and described that as allowing all internal cluster traffic. Cilium's `cluster` entity is the documented way to represent cluster endpoints, so the policy was changed to allow `toEntities: cluster` and `kube-apiserver` instead.

## Review Notes
The examples are technically valid after the changes. In real clusters, DNS labels and ports can differ, especially on OpenShift or customized CoreDNS deployments, so readers should confirm their DNS pod labels before applying these policies.
