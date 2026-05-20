# Validation Summary: How to Fix ArgoCD Repo Server Out of Memory

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD repo server
- Kubernetes Deployments, pods, resources, volumes, and kubectl
- Git repository cloning and shallow clones
- Helm, Kustomize, and Config Management Plugins
- Prometheus metrics and alerts
- Go runtime memory management

## Sources Consulted
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD high availability guide, including repo server scaling, caching, exec timeouts, metrics, and shallow clone guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes volumes documentation for `emptyDir`: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post incorrectly said each repo server request clones a repository. I changed this to say each request uses a checked-out repo and runs the configured tool, because Argo CD maintains a local repository cache.
- The post incorrectly said ArgoCD clones repositories by default with limited depth and showed a non-existent `reposerver.git.fetch.depth` setting. I replaced this with the documented per-repository `depth: "1"` Secret option and the documented `argocd repo add --depth 1` command.
- The post overstated that repo clones are held entirely in memory. I clarified that the working tree and Git object database are stored on disk while Git operations still consume memory.
- The post incorrectly implied any `emptyDir` backing `/tmp` uses pod memory. I corrected this to specify memory-backed `emptyDir` volumes with `medium: Memory`, and described disk-backed `emptyDir` or PVC storage as the mitigation.
- The CMP sidecar section said sidecars are not covered by the main container's limits. I clarified that sidecars have their own container limits separate from the main repo server container and framed the `sidecars:` snippet as an Argo CD Helm chart example.

## Review Notes
The local environment did not have `kubectl`, `argocd`, or `helm` installed, so command verification was performed against official command references and documentation rather than local `--help` output. The memory sizing table remains a rule-of-thumb recommendation rather than an official Argo CD sizing matrix.
