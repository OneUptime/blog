# Validation Summary: How to Handle Config Repo vs Application Repo Separation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD Image Updater
- GitOps repository layouts
- Kubernetes manifests
- Kustomize overlays
- Helm value files with Argo CD multiple sources
- GitHub Actions
- Docker image builds and pushes
- Git branch protection, CODEOWNERS, and secret-management practices

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD Image Updater Application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater Image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater Update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Docker GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- Docker login-action documentation: https://github.com/docker/login-action
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The GitHub Actions workflow pushed `myorg/backend-api:${{ github.sha }}` to Docker Hub without logging in first. Added a `docker/login-action@v4` step using Docker's documented Docker Hub authentication pattern.
- The Argo CD Image Updater example used legacy Application annotations as a standalone configuration and used the old `latest` strategy name. Replaced it with the current `ImageUpdater` custom resource style and the renamed `newest-build` strategy.
- The app-repo subdirectory example said Argo CD would "only watch" the subdirectory. Argo CD's `path` selects the manifest source path, but commits elsewhere in the tracked Git revision can still produce a new revision. Changed the comment to say it uses manifests from that subdirectory.

## Review Notes
- The multiple-sources Helm example is valid: the `$values` prefix maps to the source with `ref: values`, and the referenced values path is relative to that source's repository root.
- The security recommendations are consistent with Kubernetes guidance that Secrets should be treated carefully and external secret-store patterns are appropriate for sensitive data.
