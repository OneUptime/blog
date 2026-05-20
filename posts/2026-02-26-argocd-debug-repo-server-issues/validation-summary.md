# Validation Summary: How to Debug ArgoCD Repo Server Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD repo server
- Git and SSH repository access
- Kubernetes and kubectl
- Helm
- Kustomize
- Jsonnet
- Config Management Plugins
- Prometheus metrics

## Sources Consulted
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD high availability and repo-server scaling guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD repo CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo/
- Argo CD reconciliation timeout documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm template command reference: https://helm.sh/docs/v3/helm/helm_template/
- Helm dependency update command reference: https://helm.sh/docs/helm/helm_dependency_update/

## Issues Found
- The path verification command attempted to run `git ls-tree` inside the repo-server deployment without changing into a cached Git checkout. This is unreliable because the repo server stores clones under its cache directory, not necessarily the container working directory. I changed it to clone the repository locally, check out the desired branch, and run `git ls-tree` there.
- The slow manifest generation section used `timeout.hard.reconciliation` as a generation timeout. Current Argo CD documentation uses reconciliation timeout settings for repository polling, while repo-server tool execution timeout is controlled with `ARGOCD_EXEC_TIMEOUT`. I replaced that example with `kubectl set env deployment/argocd-repo-server -n argocd ARGOCD_EXEC_TIMEOUT=3m` and retitled the subsection to avoid implying that raising a timeout speeds up rendering.

## Review Notes
The remaining commands and snippets are broadly correct for current Argo CD and Kubernetes usage. Some examples assume the default `argocd` namespace and default component names; installations created through Helm or customized manifests may need adjusted labels, namespaces, or resource names.
