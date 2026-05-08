# Validation Summary: Safely Updating the Calico StagedGlobalNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico StagedGlobalNetworkPolicy
- Kubernetes custom resources
- kubectl
- calicoctl
- Kubernetes RBAC

## Sources Consulted
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico staged policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes API field validation reference: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes CustomResourceDefinition field pruning reference: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The post described StagedGlobalNetworkPolicy updates as capable of directly dropping live traffic or breaking BGP peerings. Calico documentation states staged policies preview policy behavior and do not enforce traffic, so the risk language was changed to focus on misleading previews and later promotion to enforcing policies.
- The main workflow used `calicoctl get stagedglobalnetworkpolicy` and `calicoctl apply` for staged policy resources. Current Calico docs show staged policies as Kubernetes custom resources applied with `kubectl`, and the current `calicoctl apply` valid resource list does not include staged policy resources. The staged policy get, apply, verify, and rollback commands were changed to `kubectl`.
- The review checklist asked whether the staged policy change required Felix or BGP restarts. That is misleading for a staged policy update, so the checklist now asks whether the staged policy matches the intended endpoints, namespaces, and tiers.
- The troubleshooting section treated pod connectivity loss and BGP drops as direct expected failure modes of a StagedGlobalNetworkPolicy update. It now distinguishes unexpected staged preview results from live traffic impact caused by other enforcing policy changes.
- The note that unknown fields are silently ignored by `kubectl` was outdated. It now reflects modern strict field validation by default, while noting that older clusters or disabled validation can still prune unknown CRD fields.
- The CRD version command printed CRD names and creation timestamps rather than served versions. It was replaced with a JSONPath query against the staged global network policy CRD versions.
- The RBAC check used `kubectl auth can-i` with `--list` and a specific verb/resource together, and checked the enforcing global network policy resource instead of the staged global network policy resource. It now checks update and patch access for staged global network policies.
- The audit-log example used Kubernetes events as if they were audit logs. The text now separates Kubernetes audit logging from reviewing component events.

## Review Notes
The remaining Calico namespace examples assume an operator-style installation using `calico-system`; some clusters install Calico components in `kube-system`. The commands are otherwise consistent with the post's stated environment.
