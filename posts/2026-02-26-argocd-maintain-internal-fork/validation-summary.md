# Validation Summary: How to Maintain an Internal ArgoCD Fork

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Git and GitHub forks
- GitHub Actions
- Docker container images
- Go
- Kubernetes ConfigMaps and Argo CD extension points

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD resource health customizations documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD proxy extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- Argo CD notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD v2.10.2 Makefile and go.mod in the official repository: https://github.com/argoproj/argo-cd/tree/v2.10.2
- Argo CD developer guide for building custom images: https://argo-cd.readthedocs.io/en/release-2.7/developer-guide/running-locally/
- Git rebase documentation: https://git-scm.com/docs/git-rebase
- Git format-patch documentation: https://git-scm.com/docs/git-format-patch
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The build workflow placed `tags` as a top-level event under `on`, which is not the GitHub Actions syntax for filtering tag pushes. Moved it under `push` alongside `branches`.
- The build workflow built a local `argocd:$IMAGE_TAG` image but tried to tag `argoproj/argocd:$IMAGE_TAG`. Updated the example to build directly with `IMAGE_NAMESPACE=registry.internal.company.com` and push `registry.internal.company.com/argocd:$IMAGE_TAG`, matching Argo CD's Makefile image naming.
- The build workflow set `IMAGE_TAG` in one shell step and used it in a later step, where it would not be available. Recomputed `IMAGE_TAG` in the push step.
- The upstream sync workflow described the rebase as a dry run, but `git rebase` has no dry-run mode and the command performs a real rebase in the CI workspace. Updated the comment to say it attempts the rebase in the disposable CI workspace.
- The Go snippet imported `github.com/argoproj/argo-cd/v2/server/session` and referenced `session.SessionManager`, which does not exist there in Argo CD v2.10. Updated it to import `github.com/argoproj/argo-cd/v2/util/session` as `sessionmgr` and use `*sessionmgr.SessionManager`.

## Review Notes
The guide remains version-specific around the v2.10 branch and Go 1.21, which matches Argo CD v2.10.2's `go.mod`. Future updates should revisit the examples for Argo CD v3.x because the latest upstream release line now uses the v3 module path and newer build requirements.
