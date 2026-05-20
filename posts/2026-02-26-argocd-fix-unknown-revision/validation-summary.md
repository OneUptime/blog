# Validation Summary: How to Fix 'unknown revision' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Git
- Kubernetes
- Helm
- ApplicationSet

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD tracking and deployment strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD high availability / repo-server shallow clone documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD ApplicationSet pull request generator documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/Generators-Pull-Request/
- Git `ls-remote` documentation: https://git-scm.com/docs/git-ls-remote
- Helm `helm search repo` command reference: https://helm.sh/docs/helm/helm_search_repo/

## Issues Found
- Replaced `git ls-remote --heads` with `git ls-remote --branches` because current Git documentation marks `--heads` as a deprecated synonym.
- Changed the empty-repository initialization command from `git init` to `git init -b main` so the later `git push -u origin main` command works even when the user's default Git branch is not `main`.
- Corrected the shallow clone section. Argo CD does not use shallow clones by default; the official `argocd repo add` reference says the default depth is `0`, meaning a full clone. The post now describes shallow clone limitations only when shallow cloning is enabled and uses the documented repository Secret `depth` setting instead of the undocumented `reposerver.git.fetch.depth` ConfigMap key.
- Reworded the repo-server logging claim because logs can show Git error details and the target repository, but the exact Git command is not guaranteed.
- Corrected the prevention strategy label from "Git generators" to "pull request generators" because the example uses `generators.pullRequest`.

## Review Notes
The remaining commands and snippets are technically consistent with the consulted Argo CD, Git, Helm, and Kubernetes documentation. The ApplicationSet YAML is a partial illustrative snippet, not a complete standalone manifest.
