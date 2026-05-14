# Validation Summary: How to Choose the Calico REST API for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico `projectcalico.org/v3` APIs
- Calico API server and native v3 CRDs
- Kubernetes REST API
- Kubernetes RBAC
- Kubernetes service account tokens
- kubectl
- calicoctl
- Kubernetes Python client
- Go controller-runtime

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: Resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico documentation: Network policy: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Global network policy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: kubectl create token: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes documentation: Using RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Access Clusters Using the Kubernetes API: https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/
- Kubernetes Python client repository: https://github.com/kubernetes-client/python
- Calico Go API package documentation: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The prerequisites said the Calico API server was required. Updated this to reflect current Calico guidance: native v3 CRDs are preferred for new installations, while existing clusters may still use `calico-apiserver`.
- The REST API use-case list implied atomic updates across multiple resources. Kubernetes API operations do not provide general multi-resource atomic transactions, so this was changed to conflict-aware conditional updates.
- The performance note said many resources could be watched simultaneously with a single connection. Changed it to the accurate claim that watches stream resource changes and avoid polling.
- The RBAC example included an unnecessary empty `resourceNames: []` field. Removed it to avoid implying a resource-name restriction.
- The Python example listed cluster-scoped `globalnetworkpolicies`, but the RBAC example granted namespaced `networkpolicies` permissions via a namespace `RoleBinding`. Changed the Python example to list namespaced Calico `networkpolicies` in `production`.
- The Go import path for Calico APIs was incorrect. Changed it from `github.com/projectcalico/api/pkg/apis/projectcalico.org/v3` to `github.com/projectcalico/api/pkg/apis/projectcalico/v3` and showed `AddToScheme` usage with a controller-runtime manager.
- The client-library benefits overstated type safety and automatic retries for all clients. Reworded it to distinguish standard Kubernetes auth/config/watch support from typed Go objects and controller/informer patterns.
- The HTTP success and conflict table was incomplete. Added `202` and `204` as possible success codes and clarified that `409 Conflict` can mean either an already-existing resource or an update conflict.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI validation was performed against official Kubernetes generated command documentation instead of local `--help` output.
- The post now aligns with Calico Open Source 3.32 documentation, where `calico-apiserver` is deprecated for new installations in favor of native v3 CRDs.
