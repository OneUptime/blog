# Validation Summary: Safely Updating the Calico StagedKubernetesNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico StagedKubernetesNetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- Calico calicoctl
- Kubernetes RBAC
- Calico IPAM

## Sources Consulted
- Calico staged Kubernetes network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico staged policy workflow documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API field validation documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The post used `calicoctl get stagedkubernetesnetworkpolicy` and `calicoctl apply` for StagedKubernetesNetworkPolicy resources. Current Calico staged policy documentation shows StagedKubernetesNetworkPolicy as a Kubernetes custom resource used with `kubectl`, while current `calicoctl get` valid resource types do not include staged policy resources. Updated staged policy backup, diff, apply, verify, and rollback commands to use `kubectl`.
- The post described StagedKubernetesNetworkPolicy updates as directly capable of dropping traffic or breaking BGP peerings. Calico staged policies preview policy impact without changing actual traffic flow. Updated the wording to distinguish staged preview changes from later enforcement as a NetworkPolicy, and removed the BGP-specific troubleshooting from this staged policy guide.
- The post said unknown fields are silently ignored by `kubectl`. Modern `kubectl apply` defaults to strict validation. Updated the troubleshooting note to reflect strict validation by default, with caveats for older clusters or `--validate=warn` / `--validate=ignore`.
- The RBAC example used `kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org --all-namespaces --list`, which mixed an action check with `--list` and checked the wrong resource for this post. Replaced it with a focused permission check for updating `stagedkubernetesnetworkpolicies.projectcalico.org`.
- The audit/event command implied `kubectl get events` reviews Kubernetes audit logs. Updated the comment so it accurately describes checking recent namespace events.

## Review Notes
The Calico namespace and labels used in the log and pod commands are common for operator-based installations, but some Calico deployments use different namespaces or labels. Future improvements could mention adjusting those selectors to match the installation.
