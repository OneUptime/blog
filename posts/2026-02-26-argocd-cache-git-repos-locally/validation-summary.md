# Validation Summary: How to Cache Git Repos Locally in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD repo server
- Argo CD repository caching
- Argo CD repository Secrets and repository credential templates
- Argo CD CLI
- Kubernetes Deployments, StatefulSets, PersistentVolumeClaims, and emptyDir-backed storage
- Prometheus metrics and alerting
- Git configuration

## Sources Consulted
- Argo CD high availability and repo-server scaling documentation - https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd-cmd-params-cm` reference - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-repo-server` command reference - https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD metrics documentation - https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd repo add` command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app list` command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD declarative setup documentation for repositories and repo credentials - https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes kubectl command reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes StatefulSet documentation - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Git `git-config` documentation - https://git-scm.com/docs/git-config

## Issues Found
- The introduction said lack of proper caching means a full clone on every reconciliation cycle. Argo CD's repo server maintains a local repository cache, so the wording was corrected to describe cloning when the local cache is empty.
- The cache expiration section described `reposerver.repo.cache.expiration` as keeping cloned repositories longer before purging. Argo CD documents this setting as cache expiration for repo state, app details, manifest generation, and revision metadata, so the explanation was corrected.
- The shallow clone example used a non-documented `reposerver.git.shallow.clone` parameter. Argo CD documents shallow cloning as a per-repository `depth: "1"` option or `argocd repo add --depth`, so the example was replaced.
- The Git fetch optimization section recommended `http.postBuffer` for large-repository fetches. Git documents this as a smart HTTP POST buffer, so the section was narrowed to standard Git config behavior and the `http.postBuffer` recommendation was removed.
- The cache warm-up example pre-cloned repositories into guessed `/tmp` directory names. Argo CD treats repo-server cache paths as internal implementation details, so the example was changed to trigger application refreshes through the Argo CD CLI.
- The monitoring section called the metrics a cache hit-rate check. Argo CD exposes Git request duration and count metrics, not a direct repo-cache hit-rate metric, so the heading and commands were corrected.
- The cleanup commands deleted `/tmp/_*` and a guessed repository cache path. Because Argo CD does not document those internal directory names, the cleanup guidance now tells readers to inspect `/tmp` and delete only verified cache directories.
- The Git mirror section implied that a `repo-creds` Secret points Argo CD at the mirror. Repository credentials only provide credentials for matching URLs, so the text now says applications and repository entries must use the mirror URL.

## Review Notes
The Kubernetes and Argo CD YAML snippets are intended as focused configuration snippets for existing Argo CD manifests. `kubectl` was not installed in the local workspace, so kubectl command syntax was checked against the official Kubernetes command reference instead of local `--help` output.
