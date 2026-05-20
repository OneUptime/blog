# Validation Summary: How GitOps Differs from Traditional CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitOps
- Argo CD
- Flux
- Kubernetes
- kubectl
- Helm
- GitHub Actions
- Kustomize
- CI/CD

## Sources Consulted
- OpenGitOps Principles: https://opengitops.dev/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl edit reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_edit/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Microsoft Azure Kubernetes actions documentation: https://learn.microsoft.com/en-us/azure/aks/kubernetes-action

## Issues Found
- The credential-management section said ArgoCD "only needs read access to Git repositories." This was too broad because Argo CD also needs Kubernetes permissions to apply desired state to the destination cluster. Updated the sentence to say Argo CD reads desired state from Git and uses in-cluster Kubernetes permissions to apply changes.
- The same section said compromising CI in a GitOps setup "only gives access to the source code, not the running infrastructure." This was too absolute because CI may still have write access to the GitOps repository, source repositories, or image registries. Updated the wording to say CI compromise does not automatically grant direct infrastructure access, while repository and registry write access still need protection.

## Review Notes
- The Argo CD `Application` examples use valid fields including `repoURL`, `targetRevision`, `path`, `destination.server`, `destination.namespace`, `syncPolicy.automated.prune`, and `syncPolicy.automated.selfHeal`.
- Argo CD automated sync and self-heal behavior is accurately described, with the caveat that automated sync runs when applications are OutOfSync and reconciliation timing is controlled by Argo CD settings.
- The Kubernetes examples for `kubectl apply`, `kubectl rollout status`, `kubectl edit`, and `kubectl rollout undo` match current kubectl command references.
- The GitHub Actions workflow syntax and Helm flag examples are valid for the illustrative purpose of the post.
