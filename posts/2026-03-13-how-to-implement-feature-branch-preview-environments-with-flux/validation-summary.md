# Validation Summary: How to Implement Feature Branch Preview Environments with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux GitRepository and Kustomization APIs
- Kubernetes namespaces, labels, ResourceQuota, Ingress, and CronJob
- Kustomize overlays, patches, and image transformations
- GitHub Actions workflows
- Git and shell scripting for manifest generation

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux GitRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitHub Actions checkout action README: https://github.com/actions/checkout
- GitHub Actions github-script action README: https://github.com/actions/github-script
- GitHub Actions pull_request event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

## Issues Found
- The branch slug generation could produce invalid Kubernetes namespace names because `preview-` plus a 63-character slug exceeds the 63-character RFC 1123 label limit. It could also leave leading or trailing hyphens, which are invalid for namespace names and non-empty label values. Updated both create and destroy workflows to trim invalid edges, collapse repeated hyphens, cap the slug at 55 characters, and use a safe fallback.
- The `sed` replacement for `BRANCH_NAME_FULL` could fail for branch names containing `/` or other replacement-sensitive characters. Added escaping and changed the delimiter used for that substitution.
- The repository structure mentioned only `preview-kustomization.yaml`, but the post later introduced `templates/resource-quota.yaml`. Added the quota template to the repository tree and updated the create workflow to generate the per-branch quota manifest.
- The GitHub Actions examples used older action major versions. Updated `actions/checkout` to `v6` and `actions/github-script` to `v9`, matching the current official upstream READMEs.
- The TTL cleanup CronJob deleted namespaces directly. In a Flux-managed GitOps flow, resources still declared in Git are reconciled back into the cluster. Updated the section to remove stale generated manifests from the Git repository, regenerate `preview/kustomization.yaml`, and push the cleanup commit.
- The original cleanup CronJob used `jq` with an image that was not guaranteed to include it and did not address Git state. Replaced it with a Git-based cleanup example that reads a token from a Kubernetes Secret.

## Review Notes
- The Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization fields used in the post, including `interval`, `retryInterval`, `timeout`, `sourceRef`, `path`, `prune`, `targetNamespace`, and `postBuild.substitute`, are current and documented.
- The Flux `source.toolkit.fluxcd.io/v1` GitRepository branch reference and `secretRef` usage are current and documented.
- The Kubernetes `batch/v1` CronJob and `v1` ResourceQuota snippets use current API versions.
- The examples assume same-repository feature branches for the application source. Pull requests from forks would need additional handling for the source GitRepository URL and credentials.
