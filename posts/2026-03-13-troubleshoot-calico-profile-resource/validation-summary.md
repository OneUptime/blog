# Validation Summary: Troubleshoot Calico Profile Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Profile resources
- Calico WorkloadEndpoint resources
- Calico NetworkPolicy and GlobalNetworkPolicy behavior
- Kubernetes namespaces and NetworkPolicy namespace selectors
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico Profile resource reference: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post stated that profile rules fire after NetworkPolicies and that a profile with "Allow all egress" will override a NetworkPolicy deny. Calico documents that NetworkPolicy resources take precedence over Profile resources, and Profile ingress/egress rules are deprecated. I changed the section to state that a matching NetworkPolicy Deny is not overridden by a profile Allow, while permissive profile rules may still allow traffic that is not otherwise selected and denied by NetworkPolicy.

## Review Notes
The `pcns.projectcalico.org/name` label shown in namespace profiles is consistent with Calico-generated Kubernetes namespace profiles. Calico's public policy selector examples also document the immutable namespace label `projectcalico.org/name`; future revisions could clarify the difference between the internal profile label prefix and policy-facing automatic labels.
