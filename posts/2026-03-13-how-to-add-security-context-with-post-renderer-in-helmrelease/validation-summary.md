# Validation Summary: How to Add Security Context with Post-Renderer in HelmRelease

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Flux HelmRelease
- Helm post-renderers
- Kustomize patches
- Kubernetes Deployments
- Kubernetes pod and container security contexts
- Kubernetes Pod Security Standards
- kubectl
- jq

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/

## Issues Found
- The Restricted Pod Security Standard section overstated compliance. The example configures one named regular container and one named init container, but the Restricted profile applies to all regular, init, and ephemeral containers and includes other pod-level restrictions. Updated the text to say the configuration helps meet key Restricted controls and that full compliance requires all containers and the rest of the pod spec to comply.
- The verification commands used `kubectl -o jsonpath` to select object values and piped them to `jq`. Kubernetes documents that JSONPath result objects are printed using their `String()` function, so the output is not guaranteed to be valid JSON for `jq`. Updated the commands to use `kubectl -o json | jq '...'`.

## Review Notes
The Flux `spec.postRenderers` field, Kustomize `patches` usage, Kubernetes security context fields, seccomp `RuntimeDefault`, Linux capabilities syntax without the `CAP_` prefix, and `kubectl exec deployment/... -- command` form are consistent with current official documentation. The examples assume the rendered chart contains containers with the exact names shown; if a container name does not match, a strategic merge patch can add an incomplete container entry instead of patching the intended one.
