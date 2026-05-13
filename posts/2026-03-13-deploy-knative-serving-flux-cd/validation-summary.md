# Validation Summary: How to Deploy Knative Serving with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Knative Serving
- Kourier
- Knative autoscaling
- YAML manifests

## Sources Consulted
- Knative Serving YAML installation documentation: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Serving installation files reference: https://knative.dev/docs/install/yaml-install/serving/serving-installation-files/
- Knative networking configuration documentation: https://knative.dev/docs/serving/config-network-adapters/
- Knative autoscaling scale bounds documentation: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative v1.21 release notes for Kubernetes support baseline: https://knative.dev/blog/releases/announcing-knative-v1-21-release/
- Knative Serving v1.22.0 GitHub release assets: https://github.com/knative/serving/releases/tag/knative-v1.22.0
- Knative Kourier v1.22.0 GitHub release assets: https://github.com/knative-extensions/net-kourier/releases/tag/knative-v1.22.0
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/

## Issues Found
- The post described the deployment as using `HelmRelease` and included a Kong `HelmRepository`, but the examples deploy upstream Knative YAML with Flux `Kustomization`. I changed the metadata, description, introduction, and Step 1/Step 2 wording to use `Kustomization` and removed the unrelated Helm repository.
- The OCIRepository example used an unsupported Knative OCI path. I replaced it with Flux `GitRepository` sources pinned to the official Knative Serving and Kourier release tags.
- The post pinned Knative v1.14.0, which is outdated for a 2026 guide. I updated the examples to `knative-v1.22.0` and adjusted the Kubernetes prerequisite to 1.33+ based on current Knative support notes.
- The Kourier ingress-class patch was attached to the Kourier Kustomization, but that Kustomization does not include the `knative-serving/config-network` ConfigMap. I moved the patch to the Knative Serving Kustomization where the ConfigMap is part of the rendered resources.
- The `sslip.io` DNS example implied that plain `sslip.io` was enough for magic DNS. I changed the prerequisite and ConfigMap comment to use a real wildcard domain or `<external-ip>.sslip.io`.
- The autoscaling comments overstated `autoscaling.knative.dev/target` as a hard maximum and described `scale-down-delay` as direct inactivity timing. I corrected the comments to match Knative's target concurrency and scale-down delay semantics.
- The best-practice note used `minScale: 1`, which is not the Knative annotation key. I changed it to `autoscaling.knative.dev/min-scale: "1"`.

## Review Notes
The guide now uses Flux's generated `kustomization.yaml` behavior for plain YAML directories in upstream repositories. For production, a future improvement would be to mirror the exact Knative release YAML assets into the platform repository so they can be validated in CI and reviewed alongside local Flux customizations.
