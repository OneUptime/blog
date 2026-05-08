# Validation Summary: Using the Calico StagedKubernetesNetworkPolicy Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes NetworkPolicy
- Calico StagedKubernetesNetworkPolicy
- kubectl
- calicoctl
- Felix
- Typha

## Sources Consulted
- Calico StagedKubernetesNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico staged policy workflow documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource documentation, for comparison with non-Kubernetes Calico staged policy fields: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico FelixConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top

## Issues Found
- The post used `calicoctl get stagedkubernetesnetworkpolicy -o yaml`. The official `calicoctl get` resource list does not include `StagedKubernetesNetworkPolicy`, while the Calico resource documentation gives `kubectl` aliases for this CRD. Changed staged policy inspection commands to `kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces -o yaml`.
- The post described using node selectors and node labels with `StagedKubernetesNetworkPolicy`. This resource follows Kubernetes `NetworkPolicy` structure, using `podSelector`, `namespaceSelector`, ingress, egress, and `policyTypes`, not node selectors. Replaced the node-label example with namespace labels and selector guidance.
- The post recommended increasing reconciliation intervals for `StagedKubernetesNetworkPolicy`. That is not a field on this resource. Replaced it with guidance to keep staged policies targeted with `podSelector` and `namespaceSelector`.
- The Felix health check commands used `<node-ip>:9099` and tied the check to Prometheus. Felix health is controlled by Felix health settings, defaults to port `9099`, and may bind to localhost. Updated the text to note that health checks must be enabled and reachable, and changed the example to `localhost`.
- The `calicoctl node status` command was described as general Calico system health. Official documentation describes it as checking the local Calico node instance and BGP peering state. Updated the command comment accordingly.
- Troubleshooting guidance referred to configuration reloads and node selectors for staged policies. Updated it to refer to policy updates and `podSelector` / `namespaceSelector` matching.
- The RBAC check used `kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org --all-namespaces --list`, which mixed a specific access check with `--list` and used the wrong API group form. Replaced it with a specific `can-i create stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces` check and a separate `--list` command.

## Review Notes
The commands assume an Operator-style Calico install using the `calico-system` namespace and labels such as `k8s-app=calico-node`. Some installations use different namespaces or labels, so operators may need to adjust those examples for their deployment.
