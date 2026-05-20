# Validation Summary: How to Handle Kustomize Remote Bases in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes
- Git remote bases
- GitHub HTTPS and SSH repository access

## Sources Consulted
- Kustomize remote build documentation: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/remoteBuild.md
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD declarative repository setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Kubernetes `kubectl kustomize` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- Kustomize commit SHA examples used short hashes. Kustomize documents that `ref` should use a branch, tag, or full commit hash and that short hashes are not supported, so the examples were changed to full-length commit hashes.
- The load restrictor section said remote bases require `--load-restrictor LoadRestrictionsNone`. Kustomize's load restrictor controls local file access outside the kustomization root, so the section was corrected to say remote bases do not require this setting by themselves.
- The load restrictor error example used a remote URL. It was changed to a local path example because the restriction applies to local files.
- The private repository authentication section said to register the remote base repository with Argo CD. Argo CD documents that private remote bases inherit credentials from the application's source repository and cannot use unrelated registered repository credentials, so the commands and repository Secret were changed to configure the application repository with credentials that can also read the remote base.
- The caching section said hard refresh forces re-cloning and that tag pins always point to fixed commits. The wording was corrected to match Argo CD's documented hard refresh behavior and to note that tags are only reliable when treated as immutable, while commit SHA pins are most reproducible.
- The troubleshooting authentication command checked the remote base repository directly. It was updated to check the application repository credentials, matching Argo CD's remote base credential behavior.

## Review Notes
The examples are illustrative and use placeholder repositories, tokens, and manifests. The Argo CD Application manifest omits `spec.project`; clusters commonly default this in generated examples, but adding `project: default` can make the manifest more explicit in future revisions.
