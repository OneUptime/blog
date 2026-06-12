# Validation Summary: How to Build ArgoCD Pull Request Generator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD ApplicationSet Pull Request Generator
- Argo CD Notifications
- Kubernetes manifests, Ingress, ResourceQuota, and CronJob
- Kustomize
- Helm values in Argo CD Applications
- GitHub Actions and GitHub Container Registry
- GitHub, GitLab, and Bitbucket pull request integrations

## Sources Consulted
- Argo CD Pull Request Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD GitHub notifications service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/github/
- Argo CD automated sync retry documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- GitHub Actions pull request event documentation: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Issues Found
- The GitHub setup described adding repository credentials but did not create the `github-token` Secret referenced by the Pull Request Generator. Added a `kubectl create secret generic github-token` command and clarified the separate purposes of API access and Argo CD repository credentials.
- The template variable table said `head_short_sha` is 7 characters and described `labels` as a comma-separated string. Updated this to match Argo CD documentation: `head_short_sha` is 8 characters, `head_short_sha_7` is the 7-character value, and `labels` is an array for Go Template ApplicationSets.
- Kustomize `patches` entries used bare file names. Updated them to `path: patch-resources.yaml`, matching current Kustomize documentation.
- The dynamic ingress section said the example used Kustomize replacements, but the snippet uses patches. Updated the wording to say Kustomize patches.
- The GitHub Actions workflow only ran on `labeled` and `synchronize`, so already-labeled PRs opened or reopened could be missed. Added `opened` and `reopened`, and added explicit `contents: read` and `packages: write` permissions for GHCR pushes with `GITHUB_TOKEN`.
- The Argo CD Notifications template used only `message`, which does not configure a GitHub pull request comment. Updated it to use `github.pullRequestComment.content` with `repoURLPath` and `revisionPath`.
- The GitLab Pull Request Generator example used a namespace/project path for `project`, while Argo CD documents the GitLab project ID. Replaced it with a numeric project ID placeholder.
- The "Resource Cleanup and Limits" heading was missing Markdown heading syntax. Added `##`.
- The stale cleanup section incorrectly implied `requeueAfterSeconds` can delete inactive PR environments. Clarified that it controls polling only, and stale inactivity cleanup requires an external policy such as the CronJob shown.
- The cleanup CronJob selected namespaces with `type=preview`, but the examples did not set that label. Updated the loop to select namespaces with the `preview-` prefix used by the ApplicationSet destination namespaces.

## Review Notes
Validated the edited non-templated YAML snippets with a local PyYAML parse check. Templated Argo CD, Helm, and GitHub Actions snippets were reviewed against official docs but not parsed as raw YAML because they intentionally contain template expressions.
