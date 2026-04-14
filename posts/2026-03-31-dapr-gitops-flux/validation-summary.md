# Validation Summary: How to Implement GitOps for Dapr with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2 (CNCF GitOps toolkit)
- Dapr (Distributed Application Runtime)
- Kubernetes
- Kustomize (via Flux Kustomization controller)
- Flux Image Automation controllers (ImageRepository, ImagePolicy)
- kubectl

## Sources Consulted
- Flux GitRepository API docs: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization API docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository API docs: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy API docs: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Installation docs: https://fluxcd.io/flux/installation/
- Flux CLI reference (flux check, flux reconcile): https://fluxcd.io/flux/cmd/
- kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
1. **Image Automation API version outdated**: The post used `image.toolkit.fluxcd.io/v1beta2` for both `ImageRepository` and `ImagePolicy` resources. The image automation APIs have been promoted to stable and the correct current API version is `image.toolkit.fluxcd.io/v1`. Updated both resource manifests to use `v1`.

## Review Notes
- The `healthChecks` field in the Dapr Components Kustomization references a `dapr.io/v1alpha1 Component` resource. While syntactically correct per the Flux API, Flux health checks rely on the target resource reporting standard Kubernetes status conditions. Whether Dapr Component resources report conditions that Flux can interpret depends on the Dapr operator version. This may require testing in practice.
- The `kubectl events` subcommand requires kubectl v1.26+ (alpha) or v1.28+ (stable). Readers on older kubectl versions would need to use `kubectl get events` instead.
- The Image Automation feature requires installing additional controllers (`image-reflector-controller` and `image-automation-controller`) that are not included in the default Flux bootstrap. The post does not mention this prerequisite, which could cause confusion for readers who apply these manifests without the extra controllers installed.
