# Validation Summary: How to Set Up Integration Tests for Flux Deployments with Chainsaw

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Chainsaw
- Flux
- Kubernetes
- kind
- GitHub Actions
- Helm
- Kustomize

## Sources Consulted
- Chainsaw installation documentation: https://kyverno.github.io/chainsaw/main/quick-start/install/
- Chainsaw configuration file documentation: https://kyverno.github.io/chainsaw/main/configuration/file/
- Chainsaw v1alpha1 API reference: https://kyverno.github.io/chainsaw/main/reference/apis/chainsaw.v1alpha1/
- Chainsaw v1alpha2 API reference: https://kyverno.github.io/chainsaw/main/reference/apis/chainsaw.v1alpha2/
- Chainsaw test command reference: https://kyverno.github.io/chainsaw/main/reference/commands/chainsaw_test/
- Chainsaw cleanup documentation: https://kyverno.github.io/chainsaw/main/quick-start/cleanup/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Kyverno Chainsaw GitHub releases: https://github.com/kyverno/chainsaw/releases
- Podinfo Git repository and Helm chart index: https://github.com/stefanprodan/podinfo and https://stefanprodan.github.io/podinfo/index.yaml

## Issues Found
- The `.chainsaw.yaml` example used `chainsaw.kyverno.io/v1alpha1` and placed `failFast` and `parallel` directly under `spec`. Current Chainsaw configuration documentation uses `chainsaw.kyverno.io/v1alpha2` and nests these fields under `spec.execution`, so the example was updated.
- The HelmRelease test directory included `02-cleanup.yaml`, but the post did not define or reference that file. The unused file was removed from the example tree.
- The manual cleanup example placed `cleanup` directly under the test `spec`. Chainsaw custom cleanup operations are step-level fields, so the cleanup block was moved under the deploy step.

## Review Notes
The Flux `GitRepository`, `Kustomization`, `HelmRepository`, and `HelmRelease` API versions and core fields match current Flux documentation. The Podinfo Git branch, Kustomize path, Helm repository URL, and `6.5.x` chart version are valid at the time of review.
