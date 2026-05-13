# Validation Summary: How to Deploy GitLab Runner with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab Runner
- GitLab Runner Helm chart
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Kubernetes executor for GitLab CI/CD
- Kubernetes Secrets

## Sources Consulted
- GitLab Docs: GitLab Runner Helm chart, https://docs.gitlab.com/runner/install/kubernetes/
- GitLab Docs: Configure the GitLab Runner Helm chart, https://docs.gitlab.com/runner/install/kubernetes_helm_chart_configuration/
- GitLab Docs: Migrating to the new runner creation workflow, https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs: Kubernetes executor, https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner Helm chart values, https://gitlab.com/gitlab-org/charts/gitlab-runner/-/blob/main/values.yaml
- GitLab Runner Helm chart templates, https://gitlab.com/gitlab-org/charts/gitlab-runner/-/tree/main/templates
- GitLab Helm chart repository index, https://charts.gitlab.io/index.yaml
- Flux Docs: HelmRelease API v2, https://fluxcd.io/flux/components/helm/api/v2/
- Flux Docs: Manage Helm Releases, https://fluxcd.io/flux/guides/helmreleases/
- Flux Docs: Kustomization API and health checks, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI Docs: flux get helmreleases, https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The post used legacy runner registration-token terminology. Updated it to use runner authentication tokens, which are the current recommended GitLab Runner workflow.
- The secret creation command set both `runner-registration-token` and `runner-token` to empty strings. Updated `runner-token` to a `glrt-...` authentication-token placeholder while keeping `runner-registration-token` empty for chart compatibility.
- The Helm values used deprecated/incorrect token settings: `runnerRegistrationToken` and `existingSecret`. Updated the example to use `runnerToken: ""` and `runners.secret: gitlab-runner-secret`, matching the current GitLab Runner chart's external secret handling.
- The chart version range targeted the old 0.63.x chart family. Updated it to the current 0.88.x chart family found in the official GitLab chart repository index.
- The best-practices section recommended `runners.tags` for tagging with Helm values. Updated this to configure tags when creating the runner in GitLab, because several registration-time fields are ignored with runner authentication tokens.
- The best-practices section implied token secret updates are automatically consumed by running pods. Clarified that Flux applies the secret update, but the runner pod must be restarted or reconciled to read the new token.
- The best-practices section recommended `podAnnotations` for job cloud-credential annotations. Updated this to `[runners.kubernetes.pod_annotations]`, which applies to build pods created by the Kubernetes executor.

## Review Notes
The Flux `HelmRepository`, `HelmRelease`, `Kustomization`, and `flux get helmreleases --watch` examples match current Flux API and CLI documentation. Local `flux` and `kubectl` binaries were not installed in the review environment, so command behavior was verified against official documentation rather than local `--help` output.
