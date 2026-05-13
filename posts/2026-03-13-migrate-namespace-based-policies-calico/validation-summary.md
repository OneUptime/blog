# Validation Summary: How to Migrate Existing Rules to Calico Namespace-Based Policies

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes namespaces and labels
- Calico Open Source network policy
- Calico GlobalNetworkPolicy
- kubectl
- calicoctl
- jq

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico namespace policy rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico network policy getting started documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The Kubernetes `NetworkPolicy` "Before" example was missing `spec.podSelector`, which every Kubernetes NetworkPolicy requires to select the pods the policy applies to. Added `podSelector: {}` to select all pods in the `production` namespace.
- The Kubernetes `NetworkPolicy` example omitted `metadata.namespace` even though the migration command deletes the old policy from `production`. Added `namespace: production` so the example and command refer to the same object.
- The "Before" policy allowed all ports from the CIDR while the "After" policy only allowed ports `9090` and `9091`. Added matching TCP ports and `policyTypes: [Ingress]` to the Kubernetes example so the migration comparison is consistent.
- The Calico `GlobalNetworkPolicy` used top-level `selector: all()` without a namespace scope, which would apply the ingress allow rule to all selected endpoints cluster-wide. Added top-level `namespaceSelector: environment == 'production'` so the global policy targets production namespaces labeled earlier in the guide.
- The audit command only reported ingress `from` selectors. Added `egress_to_types` so the audit also surfaces egress `to` rules that may use pod selectors or IP blocks.
- The test command used the short service name `production-app` from the `monitoring` namespace, which would resolve in the monitoring namespace rather than production. Changed it to `production-app.production.svc.cluster.local`.

## Review Notes
Calico supports applying Calico `NetworkPolicy` and `GlobalNetworkPolicy` with `calicoctl apply -f`, and Kubernetes `kubectl label namespace ... --overwrite` remains current. The example still assumes the target workloads and service DNS names exist in the reader's cluster; that is acceptable for a migration guide but should be adapted before production use.
