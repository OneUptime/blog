# Validation Summary: How to Test Network Policies with Calico with Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- Helm
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Install using Helm, https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico documentation: Enable a default deny policy for Kubernetes pods, https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Migrate from one IP pool to another, https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl expose, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The original GlobalNetworkPolicy selected both `Ingress` and `Egress`, but the later Kubernetes NetworkPolicy only allowed ingress to the backend pod. Because selected frontend pods would still be egress-isolated, the final connectivity test would not succeed. I changed the default-deny GlobalNetworkPolicy to ingress-only so the allow-ingress NetworkPolicy works as described.
- The original GlobalNetworkPolicy used a workload selector with `projectcalico.org/namespace`. Calico supports namespace scoping for GlobalNetworkPolicy, and the official default-deny guidance now uses `namespaceSelector` with the standard Kubernetes namespace label. I updated the example to use `namespaceSelector: kubernetes.io/metadata.name not in {...}` and included `kube-public` in the excluded system namespaces.
- The introduction claimed that modifying the Installation CR to change encapsulation or CIDR should maintain enforcement throughout the transition. Calico documentation treats IP pool CIDR changes as a migration workflow with specific steps and caveats, not a simple policy test. I narrowed the claim to the operator keeping the policy enforcement layer healthy while resources are reconciled.

## Review Notes
- The `busybox` and `nginx` test pod commands, `kubectl expose pod`, `kubectl exec`, Calico `GlobalNetworkPolicy`, Kubernetes `NetworkPolicy`, and `kubectl get tigerastatus` usage are consistent with current official documentation.
- The tutorial assumes DNS is already working in the cluster and that `calicoctl` is configured for the Kubernetes datastore.
