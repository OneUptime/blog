# Validation Summary: How to Hard Refresh Application in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application API
- Kubernetes
- Helm
- Redis

## Sources Consulted
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD application API package reference for refresh annotation behavior: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apis/application/v1alpha1
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post repeatedly described hard refresh as invalidating "all caches" and re-cloning or re-fetching Git repository content. Official Argo CD docs describe `--hard-refresh` as refreshing application data and the target manifests cache, while the refresh annotation docs specify that `hard` invalidates manifest cache and target cluster state cache. Updated the wording to avoid promising Git cache invalidation or a repository reclone.
- The normal refresh section said normal refresh primarily invalidates the Git cache. Updated it to describe normal refresh as refreshing application data while allowing valid caches to be used.
- The manifest-generation example implied that committed Helm values, Kustomize overlay, or Jsonnet changes might require hard refresh. Since a Git revision change normally changes the manifest cache key, revised this to focus on inputs that can change without a Git revision change, such as external dependencies, plugin side inputs, or remote bases.
- The performance section claimed hard refresh performs a full Git fetch and fresh direct API reads for all resources. Reworded it to the documented cache behavior: repository/dependency checks may rerun, manifest generation bypasses the target manifests cache, and the target cluster state cache is invalidated before comparison.
- The cache architecture diagram claimed normal refresh invalidates the Git cache and hard refresh invalidates all cache layers. Updated the diagram and explanation to reflect documented manifest-cache and target-cluster-state-cache invalidation.
- The clearing-caches section said restarting the repo server clears all cached data. Updated it to state that restarting the repo server clears repo-server local repository and manifest-generation state.

## Review Notes
The CLI examples using `argocd app get --hard-refresh`, the API-style `GET /api/v1/applications/<app>?refresh=hard`, `argocd app list -o name`, `kubectl rollout restart`, `kubectl rollout status`, and `kubectl exec ... -- redis-cli FLUSHALL` are syntactically plausible against the referenced docs. The `reposerver.repo.cache.expiration` and `reposerver.parallelism.limit` ConfigMap keys are current in the Argo CD command-parameters reference.
