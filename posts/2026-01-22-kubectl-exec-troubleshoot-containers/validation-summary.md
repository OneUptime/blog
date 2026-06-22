# Validation Summary: How to Use kubectl exec to Troubleshoot Running Containers

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl exec
- kubectl debug and ephemeral containers
- kubectl cp
- Kubernetes RBAC
- Kubernetes audit policy

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes Debug Running Pods guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Ephemeral Containers concept: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes RBAC authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kube-apiserver audit configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/

## Issues Found
- The debug-container section used `kubectl debug my-pod -it --image=busybox --share-processes` as if `--share-processes` applied directly to an ephemeral container in the existing pod. Kubernetes documents `--share-processes` as applying when `--copy-to` creates a copied pod, so the command was changed to `kubectl debug my-pod -it --image=busybox --share-processes --copy-to=my-pod-debug`.
- The post stated that a debug container can see other container processes without qualification. Kubernetes documents that process visibility requires process namespace targeting support for ephemeral containers, or process namespace sharing in a copied pod, so the explanation was updated.
- The cleanup example said to remove debug containers with `kubectl delete pod debug-pod`. Ephemeral containers cannot be changed or removed after being added to a pod; deleting a pod is appropriate for copied debug pods, so the comment was narrowed to copied pods created with `--copy-to`.

## Review Notes
- `kubectl cp` examples are syntactically valid, but Kubernetes notes that `kubectl cp` requires the `tar` binary inside the container image.
- Several troubleshooting commands depend on tools being present inside the target image, such as `curl`, `wget`, `netstat`, `ss`, `ps`, `top`, database clients, and language runtimes. The post already points readers toward debug containers for minimal images.
