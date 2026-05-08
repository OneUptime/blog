# Validation Summary: How to Verify End-User RBAC in a Hard Way Calico Cluster Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes RBAC
- Kubernetes custom resources
- kubectl
- calicoctl
- YAML manifests

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Calico hard-way end user RBAC documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Calico hard-way datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico resource definitions documentation: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico v3.32.0 CRD manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/crds.yaml

## Issues Found
- The namespace network admin ClusterRole included read-only permissions for cluster-scoped resources, but the example bound it with a RoleBinding. Kubernetes RoleBindings can bind a ClusterRole only within the RoleBinding namespace and cannot grant cluster-scoped access. I split the cluster-scoped read permissions into a separate `calico-global-network-viewer` ClusterRole and added a ClusterRoleBinding for the namespace admin test account.
- The functional `kubectl apply` example used `apiVersion: projectcalico.org/v3` while the post's RBAC checks and troubleshooting target the stored Calico CRD API group, `crd.projectcalico.org`. I changed the test policy manifest to `apiVersion: crd.projectcalico.org/v1` so it matches CRD-based `kubectl` access.
- The RBAC verification matrix tested namespaced `networkpolicies` without specifying a namespace, which would depend on the user's current kube context. I updated the script to pass `-n default` for `networkpolicies`.
- The troubleshooting note implied `projectcalico.org` always requires the Calico API server. I updated it to account for Calico's native v3 CRD mode, where `projectcalico.org/v3` resources can also be served directly as native CRDs.
- The calicoctl troubleshooting note omitted Calico's documented requirement for cluster-level `get` access to `clusterinformations` for version checks. I added that caveat.

## Review Notes
None.
