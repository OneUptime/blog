# Validation Summary: Building a Runbook for Namespace Selector Problems with Unlabeled Namespaces

## Status
validated

## Post Type
Operational runbook / technical guide

## Technologies Covered
- Kubernetes namespaces, labels, pods, events, and `kubectl`
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico FelixConfiguration logging
- Python JSON processing for policy inspection

## Sources Consulted
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico namespace policy rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs

## Issues Found
- The runbook said Step 3.3 extracted namespace selectors for each policy, but the command only inspected namespaced Calico NetworkPolicy resources. I added a matching GlobalNetworkPolicy extraction command because global policies can also contain namespace selectors and affect traffic.
- The validation step listed "connection refused" as an expected blocked-traffic result. I changed this to "timeout or another policy-specific denial signal" because a connection refusal usually means the network path reached a closed port rather than proving that policy enforcement blocked the traffic.
- The troubleshooting section said a deny rule in any matching policy takes precedence. I corrected this to Calico's ordered evaluation model: policies are evaluated by tier and policy order, and the first matching Allow or Deny action is final.

## Review Notes
The Calico selector syntax, `projectcalico.org/v3` policy examples, `namespaceSelector` usage, `kubernetes.io/metadata.name` namespace label, `kubectl` label and JSONPath examples, and Felix `logSeverityScreen: Debug` setting are consistent with current official documentation. The local environment did not have `kubectl` installed, so `kubectl` flag checks were verified against documentation rather than local `--help` output.
