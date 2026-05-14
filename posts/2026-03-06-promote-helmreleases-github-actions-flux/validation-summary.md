# Validation Summary: How to Promote HelmReleases with GitHub Actions and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux notification-controller Provider and Alert resources
- GitHub Actions
- GitHub CLI
- Kubernetes
- Helm
- YAML
- Bash

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `flux build kustomization` command documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions repository_dispatch documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch
- GitHub REST API workflow dispatch documentation: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
- GitHub CLI help output for `gh workflow run`, `gh run watch`, and `gh pr create`

## Issues Found
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation shows `Provider` and `Alert` examples using `notification.toolkit.fluxcd.io/v1beta3`, while `notification.toolkit.fluxcd.io/v1` is used for `Receiver`. Updated both notification resources to `notification.toolkit.fluxcd.io/v1beta3`.
- The automated promotion workflow dispatches another workflow through the GitHub Actions REST API but did not explicitly grant `actions: write` to `GITHUB_TOKEN`. GitHub documents that the workflow dispatch endpoint requires Actions write permission. Added `permissions: actions: write`.
- The validation workflow ran `flux build kustomization` with `|| true`, which would hide Flux build failures while claiming to validate the manifests. Removed `|| true` so validation failures fail the job.

## Review Notes
The promotion and rollback workflows use simple `grep` and `sed` patterns that work for the shown YAML shape, but a future improvement would be to use a YAML-aware tool such as `yq` for more resilient edits if the HelmRelease files become more complex.
