# Validation Summary: Common Mistakes to Avoid with Calico Service Account Network Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes ServiceAccounts
- Kubernetes Deployments
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Use service accounts rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico documentation: Network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Calico automatic labels - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post used `source.serviceAccountSelector: name == 'backend-sa'` in rule examples. Calico rule source and destination service account matches use `serviceAccounts.names` for exact service account names or `serviceAccounts.selector` for service account labels, so the examples were corrected.
- The post described `name == 'sa-name'` as the service account name selector syntax. Calico's automatic name label is `projectcalico.org/name`, and rule-level exact name matching should normally use `serviceAccounts.names`, so the explanation and examples were corrected.
- The post implied an explicit `Deny` rule is always required after service account allow rules. Calico follows Kubernetes pod policy behavior for selected pods, where unmatched ingress is denied when an ingress policy applies. The guidance was narrowed to say explicit `Deny` is useful as a hard stop for ordered policy/profile evaluation.
- The cross-namespace example used the incorrect rule field and a generic namespace label. It was updated to use `serviceAccounts.names` and Calico's namespace name label `projectcalico.org/name`.
- The Deployment section said patching a running Pod's service account only affects that pod instance. Kubernetes does not allow updating `spec.serviceAccountName` on an existing Pod, so the text was corrected to state that such a patch is rejected and the Deployment template must be updated.
- The service account deletion/recreation section described the recreated ServiceAccount as a different identity for policy purposes. Calico name-based policy still matches a recreated ServiceAccount with the same name, though bound tokens for the deleted object are invalidated, so that wording was corrected.

## Review Notes
The post is now technically valid for the Calico v3 policy model referenced by the post. A future improvement would be to include complete `apiVersion`, `kind`, `metadata`, and `selector` fields in every YAML example so readers can apply the snippets directly.
