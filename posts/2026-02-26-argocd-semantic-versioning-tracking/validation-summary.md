# Validation Summary: How to Use Semantic Versioning for Tracking in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Semantic Versioning
- Git tags
- GitHub Actions

## Sources Consulted
- Argo CD Tracking and Deployment Strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `util/versions` package documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/util/versions
- Masterminds semver constraint documentation: https://github.com/Masterminds/semver
- Semantic Versioning 2.0.0 specification: https://semver.org/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post described semver tracking as primarily native to Helm chart repositories and implied Git tag semver patterns needed to be implemented externally with CI/CD. Argo CD's current tracking strategy documentation also supports semver constraints for Git tags, so the wording was corrected to include both Helm chart versions and semver Git tags.
- The GitHub Actions tag trigger used `v[0-9]+.[0-9]+.[0-9]+`, which reads like a regular expression. GitHub Actions `tags` filters use glob patterns, so it was changed to `v*.*.*` with an explicit shell regex check in the workflow step.
- The `argocd repo get` example used `--type helm`, but the documented `repo get` command does not support a `--type` flag. The example was changed to `argocd repo get https://charts.myorg.com -o yaml`.

## Review Notes
The semver constraint examples, pre-release `-0` behavior, Argo CD Application fields for Helm chart sources, and `argocd app set --revision` usage were consistent with the consulted documentation. The example repository URL is illustrative and was not expected to resolve.
