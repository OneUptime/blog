# Validation Summary: How to Create a Complete GitHub Actions + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Container Registry
- Docker Buildx GitHub Actions
- Go CI workflows
- Kubernetes Deployments and Services
- Kustomize
- Argo CD Applications
- Argo CD Notifications
- Argo CD Image Updater
- GitHub App tokens

## Sources Consulted
- GitHub Docs, workflow syntax and job permissions: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Docs, publishing Docker images and GHCR authentication from Actions: https://docs.github.com/en/actions/how-tos/use-cases-and-examples/publishing-packages/publishing-docker-images
- GitHub Docs, building and testing Go: https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-go
- `actions/checkout` official repository: https://github.com/actions/checkout
- `actions/setup-go` official repository: https://github.com/actions/setup-go
- `golangci/golangci-lint-action` official repository: https://github.com/golangci/golangci-lint-action
- Docker `login-action` official repository: https://github.com/docker/login-action
- Docker `metadata-action` official repository: https://github.com/docker/metadata-action
- Docker `build-push-action` official repository: https://github.com/docker/build-push-action
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Notifications GitHub service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/github/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/release-0.16/basics/update-strategies/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/release-0.16/basics/update-methods/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- GitHub `actions/create-github-app-token` official repository: https://github.com/actions/create-github-app-token

## Issues Found
- The GitHub Actions examples used older major versions of several actions. Updated the snippets to current documented major versions: `actions/checkout@v6`, `actions/setup-go@v6`, `golangci/golangci-lint-action@v8`, `docker/login-action@v4`, `docker/metadata-action@v6`, `docker/build-push-action@v7`, and `actions/create-github-app-token@v2`.
- The deployment update job executed both a `sed` image replacement and a Kustomize image edit. That would fail in repositories without a `kustomization.yaml` or without the standalone `kustomize` binary installed. Changed the Kustomize part to a non-executed alternative note so the shown workflow works for the plain manifest example.
- The PR preview workflow pushed to GHCR without authenticating and without granting `packages: write` permission. Added job permissions and a `docker/login-action` step using `GITHUB_TOKEN`, matching GitHub's GHCR publishing guidance.
- The preview create and cleanup jobs committed to the deployment repository without configuring Git author identity, which commonly causes `git commit` to fail in Actions. Added the same `github-actions[bot]` identity used in the main deployment update job.
- The Argo CD Image Updater example used the renamed `latest` update strategy. Updated it to `newest-build`, which the current Image Updater documentation recommends because the old `latest` name is deprecated and may be removed in a future release.

## Review Notes
- The Kubernetes Deployment, Service, resource request/limit, HTTP readiness/liveness probe, and Argo CD Application fields were consistent with current Kubernetes and Argo CD documentation.
- The Argo CD Notifications GitHub service fields and commit status template shape matched the official Argo CD Notifications documentation for single-source Applications.
- Preview environments that run on pull requests from forks may still need repository policy adjustments because GitHub restricts write tokens for forked pull request workflows by default.
