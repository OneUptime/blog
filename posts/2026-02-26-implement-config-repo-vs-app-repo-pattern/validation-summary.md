# Validation Summary: How to Implement Config Repo vs App Repo Pattern

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Application resources and automated sync
- GitOps repository structure
- Kubernetes manifests
- Kustomize overlays and remote resources
- GitHub Actions workflows
- GitHub CLI pull request creation
- Docker image build and push workflow
- Git-based deployment promotion and rollback

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions skip workflow runs documentation: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- Docker CLI `docker image push` reference: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
1. **Argo CD commit-author ignore behavior was overstated.** The post said ArgoCD should ignore commits from the bot account. Standard Argo CD Application sync does not provide a simple commit-author ignore control for watched Git revisions. Changed the guidance to say that CI workflows in the config repo should ignore bot commits, which matches the circular-trigger concern.
2. **Deprecated and removed Kubernetes PodSecurityPolicy reference.** The shared config tree used `pod-security-policies/`, but PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25. Replaced it with `pod-security-admission/`.

## Review Notes
- The Argo CD `Application` example uses valid fields: `spec.source.repoURL`, `targetRevision`, `path`, `destination.server`, `destination.namespace`, and `syncPolicy.automated.prune/selfHeal`.
- The Kustomize image update examples match the documented image override model. The exact generated `images` entry depends on the existing image name in each overlay.
- The GitHub Actions `on.push.branches` syntax, `[skip ci]` marker, and `gh pr create --title/--body` usage are valid. Real workflows also need registry authentication before `docker push` and GitHub CLI authentication for PR creation.
- Kustomize remote resources with a pinned `?ref=` are supported, but production users should pin immutable tags or commits and understand the availability risk of remote bases during manifest generation.
