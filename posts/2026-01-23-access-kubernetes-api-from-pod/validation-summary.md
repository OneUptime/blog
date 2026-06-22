# Validation Summary: How to Access Kubernetes API from Inside a Pod

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes API access from Pods
- kubectl
- curl
- Kubernetes Python client
- Kubernetes Go client-go
- Projected service account tokens

## Sources Consulted
- Kubernetes documentation: Accessing the Kubernetes API from a Pod - https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes API reference: Pod v1, automountServiceAccountToken and ServiceAccountTokenProjection - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl reference: kubectl auth can-i - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes Python client repository and examples - https://github.com/kubernetes-client/python
- client-go rest package documentation: InClusterConfig - https://pkg.go.dev/k8s.io/client-go/rest
- client-go kubernetes package documentation: NewForConfig - https://pkg.go.dev/k8s.io/client-go/kubernetes
- client-go typed core/v1 package documentation: PodInterface List - https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1

## Issues Found
- The second curl example piped output to `jq`, but the pod image used in the example is `curlimages/curl`, which is not a general debugging image with `jq` available. Removed the `jq` pipe so the command works with the shown image.
- The Python client example read the namespace file without trimming whitespace. Changed it to `f.read().strip()` so the namespace value is safe to pass to `list_namespaced_pod`.
- The Go client example passed the raw namespace file content to `Pods(...)`. Added `strings.TrimSpace` before passing the namespace to client-go.
- The projected service account token example used `audience: api`, which may not match the Kubernetes API server audience and could produce a token rejected by the API server. Removed the custom audience line so Kubernetes uses the API server audience default.

## Review Notes
The post's main ServiceAccount, Role, RoleBinding, ClusterRole, ClusterRoleBinding, in-cluster client, and `kubectl auth can-i` examples align with current Kubernetes documentation. Kubernetes documentation notes that `kubernetes.default.svc` is published for in-cluster API access, but clients can also use `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT_HTTPS` for the API server address.
