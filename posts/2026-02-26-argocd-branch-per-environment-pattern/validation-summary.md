# Validation Summary: How to Implement the Branch-per-Environment Pattern

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- GitOps
- Kubernetes Deployments
- Kustomize
- Helm values with Argo CD
- Git branching and merging
- GitHub branch protection
- GitHub Actions

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Helm values documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Git merge documentation: https://git-scm.com/docs/git-merge
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout

## Issues Found
- The best-practices branch sync example said to merge `main` back into `staging`, then `staging` back into `develop`, but the commands merged `main` directly into `develop`. Updated the commands to check out `staging`, merge `main`, push `staging`, then check out `develop`, merge `staging`, and push `develop`.
- The merge-commit example used `git merge --no-ff staging` without showing the target branch. Added `git checkout main` before the command so the example clearly preserves promotion history for staging-to-production promotion.

## Review Notes
The Argo CD Application, ApplicationSet, automated sync, Helm valueFiles, Kubernetes Deployment, Kustomize patch, Git, GitHub branch protection, and GitHub Actions examples are consistent with current official documentation. The referenced OneUptime namespace-per-environment URL returned HTTP 200 during validation.
