# Validation Summary: How to Use Git Sparse Checkout Patterns with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Flux CD kustomize-controller
- Flux CD notification-controller
- GitRepository resources
- Kustomization resources
- Git sparse checkout
- Kubernetes manifests
- Kustomize overlays and patches

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI `flux tree kustomization` documentation: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kustomize patch documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- JSON Patch RFC 6902: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The post originally described Flux sparse checkout as being handled through `GitRepository.spec.include`. Flux now has `GitRepository.spec.sparseCheckout` for sparse checkout directories, while `include` composes artifacts from other GitRepository sources. Updated the introduction, configuration section, examples, best practices, and conclusion to use `sparseCheckout` correctly.
- The post implied Kustomization `path` alone provides sparse checkout behavior. Updated the explanation to distinguish source artifact scoping with `sparseCheckout` from path-based build/apply scoping with Flux Kustomizations.
- The post overstated sparse checkout as a Git access security boundary. Updated the language to describe artifact scoping and operational isolation, and clarified that Git credentials or the Git provider must enforce repository/path access.
- The per-team GitRepository example did not include sparse checkout despite describing scoped sources. Added `sparseCheckout` to the example.
- Flux Notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux Provider and Alert resources are documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both apiVersions.
- The alerting section said alerts trigger only for changes in specific paths. Flux Alert filters events by involved Flux objects, not by raw Git path. Updated the wording to say it forwards events for Kustomization resources that reconcile those paths.
- The verification command used `flux get kustomization ... -o json`; the documented status command is `flux get kustomizations`, and resource inventory can be shown with `flux tree kustomization`. Updated the inventory command accordingly.
- The Kustomize patch used JSON Patch `replace` on `/metadata/namespace`, which fails if the field is absent. Changed it to `add`, which is valid for adding or replacing an object member.

## Review Notes
Local `flux` and `kubectl` binaries were not installed in this environment, so CLI and CRD checks were verified against current official Flux documentation rather than local help output. The post now reflects current Flux APIs as of 2026-05-14.
