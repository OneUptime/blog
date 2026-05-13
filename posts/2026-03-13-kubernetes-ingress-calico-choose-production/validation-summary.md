# Validation Summary: How to Choose Kubernetes Ingress with Calico for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico policy tiers
- Kubernetes ingress controllers
- Kubernetes kubelet readiness and liveness probes

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Declare Network Policy: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- Calico Open Source NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source tier reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico tiered policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico log rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found
- The post described Calico tiers as requiring Enterprise. Current Calico Open Source documentation includes Tier resources and tiered policy behavior, so the wording was changed to describe tiered policy without saying Enterprise is required.
- The post said Calico `Deny` actions provide audit logging. Calico uses `Log` actions for policy visibility and troubleshooting, so the wording was changed to distinguish explicit deny behavior from logging.
- The post said Calico evaluates Calico NetworkPolicy first and then falls through to Kubernetes NetworkPolicy. Calico policy evaluation depends on policy ordering and tiers, while Kubernetes NetworkPolicy semantics are additive, so the statement was replaced with more accurate guidance.
- The kubelet health check example used `from: []`, which is not kubelet-specific and would match all sources for that rule. The example was changed to use an `ipBlock` placeholder for the node CIDR, and the surrounding text now notes that standard Kubernetes NetworkPolicy allows traffic from the pod's node while Calico host endpoint or node-level controls can require explicit allowances.
- The best-practice note about allowing DNS in an ingress-focused baseline was clarified to say DNS egress.

## Review Notes
The ingress controller NetworkPolicy example uses the standard namespace label `kubernetes.io/metadata.name`, which is valid for selecting a namespace by name in current Kubernetes. The node-CIDR probe example is intentionally a placeholder because real CIDRs and source IP behavior vary by cluster, CNI dataplane, Service implementation, and cloud provider.
