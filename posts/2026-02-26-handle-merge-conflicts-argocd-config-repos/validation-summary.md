# Validation Summary: How to Handle Merge Conflicts in ArgoCD Config Repos

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Git and Git attributes
- GitHub Actions and GitHub merge queues
- kubeconform
- Bash

## Sources Consulted
- Argo CD command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD command reference for `argocd app rollback`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes JSONPath documentation for kubectl: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Git gitattributes documentation: https://git-scm.com/docs/gitattributes/2.50.0.html
- GitHub merge queue documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- actions/checkout documentation: https://github.com/actions/checkout
- kubeconform documentation: https://github.com/yannh/kubeconform
- Local Git CLI help for `git pull`, `git push`, `git revert`, and `git attributes`.

## Issues Found
- The retry script reset only the failed commit with `git reset HEAD~1`, leaving the generated image-tag change in the worktree. On the next loop, `git pull --rebase` could fail because of unstaged local changes, and the relative `cd` could also be wrong after the first iteration. Updated the script to enable standard Bash failure handling, capture the repository root, return to it each retry, use absolute paths, and reset the failed generated commit and worktree change with `git reset --hard HEAD~1`.
- The merge queue explanation said GitHub automatically rebases PR #2. GitHub's merge queue documentation describes temporary merge group branches that include the target branch plus queued PRs, with checks run on those branches. Updated the explanation to match that behavior.
- The conflict-resolution rule said to always take the newer image version. That is unsafe because the intended version for an environment is not always the numerically newest tag. Updated the rule to prefer the intended version and verify it before resolving.
- The Argo CD notification trigger accessed `app.status.operationState.phase` directly. Official Argo CD notification examples use optional chaining because `operationState` can be absent. Updated the trigger to use `app.status?.operationState.phase`.

## Review Notes
The examples are intentionally generic and assume tools such as `kustomize`, `kubeconform`, `kubectl`, `jq`, and `argocd` are installed and configured in the executing environment. The kubeconform example validates built-in Kubernetes schemas by default; repositories with CRDs may need additional schema locations.
