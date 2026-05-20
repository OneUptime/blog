# Validation Summary: How to Implement Feature Branch Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD ApplicationSets
- Argo CD Pull Request generator
- Argo CD AppProjects
- Kubernetes namespaces, Ingress, ResourceQuota, and LimitRange
- Kustomize overlays and patches
- GitHub Actions
- Docker image builds and registry pushes

## Sources Consulted
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Pull Request generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD ApplicationSet resource deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- GitHub Actions pull_request event documentation: https://docs.github.com/actions/reference/events-that-trigger-workflows
- GitHub Actions Docker image publishing documentation: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- Docker GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/

## Issues Found
- The ApplicationSet image override used `{{head_sha_short}}`, which is not a documented Pull Request generator parameter. Changed it to `{{head_short_sha_7}}`, matching Argo CD's documented seven-character PR head SHA parameter and the CI image tag.
- The GitHub Actions workflow used `GITHUB_SHA` for PR image tags. For `pull_request` workflows, GitHub documents `GITHUB_SHA` as the PR merge commit, not the PR head commit. Updated checkout and image tagging to use `github.event.pull_request.head.sha`.
- The CI example pushed to a registry without authenticating. Added a `docker/login-action@v3` step using registry credentials from secrets.
- The sequence diagram implied Argo CD posts the deployment URL to GitHub. The workflow's GitHub Actions step posts the URL, so the diagram was corrected.
- The cleanup section incorrectly attributed Application deletion cleanup to `prune: true` and implied a finalizer alone deletes the namespace created by `CreateNamespace=true`. Updated the explanation to describe ApplicationSet finalizer behavior and added `managedNamespaceMetadata` so Argo CD tracks the generated namespace.
- The introduction said every feature branch gets an environment, while the configuration creates environments for matching pull requests, optionally filtered by label. Updated the wording to "matching pull request."

## Review Notes
The examples are intentionally generic and still require real registry credentials, a valid GitHub token, an existing ingress controller, DNS, TLS issuer, and base Kubernetes manifests. GitHub Actions comments on pull requests may require repository workflow permissions that allow the token to write comments.
