# Validation Summary: How to Generate Kubernetes Manifests with GitHub Actions for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI OCI artifact commands
- Flux OCIRepository and Kustomization resources
- GitHub Actions
- GitHub Container Registry
- Kubernetes manifests
- Kustomize overlays and patches
- Helm templating
- OCI artifacts
- kubeval manifest validation

## Sources Consulted
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitHub Action documentation: https://v2-0.docs.fluxcd.io/flux/flux-gh-action/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Helm values and templating documentation: https://v3.helm.sh/docs/chart_template_guide/values_files/
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- actions/checkout documentation: https://github.com/actions/checkout
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- actions/github-script documentation: https://github.com/actions/github-script
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902
- kubeval releases: https://github.com/instrumenta/kubeval/releases

## Issues Found
- The `flux push artifact --revision` example used `main/<sha>`, but Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`. Changed it to `main@sha1:$(git rev-parse HEAD)`.
- The production and staging Kustomize JSON patches used `op: replace` for `/spec/replicas`, but the base Deployment did not define `spec.replicas`. JSON Patch `replace` requires the target path to exist, so changed those operations to `op: add`.
- The manifest diff workflow set only `pull-requests: write` permissions. When a job-level `permissions` block is specified, omitted scopes are set to `none`, so `actions/checkout` would lack repository read access. Added `contents: read`.
- The `actions/github-script` PR comment body had an invalid JavaScript template literal because the Markdown code fence was not escaped. Escaped the backticks so the script parses correctly.

## Review Notes
- `kubeval` is usable as written and the flags match its published releases, but it has not had a release since v0.16.1. For future maintenance, consider evaluating a more actively maintained validator such as kubeconform.
- The local workspace did not have `flux`, `kustomize`, or `kubeval` installed, so CLI-specific verification was performed against official documentation rather than local `--help` output. The corrected JavaScript snippet was checked with Node.
