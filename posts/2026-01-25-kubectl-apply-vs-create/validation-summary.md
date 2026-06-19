# Validation Summary: How to Use kubectl apply vs kubectl create

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes manifests
- Client-side apply
- Server-side apply
- Declarative and imperative object management

## Sources Consulted
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl create reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes declarative object management documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/
- Kubernetes object management overview: https://kubernetes.io/docs/concepts/overview/working-with-objects/object-management/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/

## Issues Found
- The post stated that `kubectl apply` generally stores the last applied configuration annotation. Updated this to specify client-side `kubectl apply`, because server-side apply uses managed fields for field ownership.
- The post discouraged mixing `create` and `apply` without mentioning the supported `kubectl create --save-config` path. Updated the explanation and best practices to match Kubernetes guidance that resources intended for future `apply` should initially be created with `apply` or `create --save-config`.
- The practical migration example applied an exported resource directly after `kubectl create`. Updated it to save the configuration annotation with `kubectl replace --save-config` after removing the status field.
- The post said Kubernetes 1.18 introduced server-side apply. Updated this to avoid the incorrect introduction claim and state that server-side apply became stable in Kubernetes 1.22.
- The `--prune` discussion did not mention kubectl's current warning that prune is incomplete/alpha. Added a caution that it should be used only with a clear understanding of what the selector can delete.
- The common pitfalls example listed `kubectl apply` and `kubectl create --save-config` as separate supported options instead of implying both should be run sequentially.

## Review Notes
The main command examples and Deployment manifest are otherwise consistent with current kubectl and Kubernetes API documentation. `kubectl apply --prune` remains documented with an alpha/incomplete warning, so future revisions may want to recommend a purpose-built GitOps controller or explicit delete workflow instead of leaning on prune for production cleanup.
