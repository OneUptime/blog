# Validation Summary: How to Configure Flux Controller Sharding by Resource Type

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux HelmRelease and HelmChart resources
- Kubernetes Deployments, Services, labels, and label selectors
- kubectl

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux Helm controller options: https://fluxcd.io/flux/components/helm/options/
- Flux v2.8.7 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.7
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post described resource-type sharding as if Flux selected resource kinds directly. Flux controller sharding is label-selector based, so I clarified that "resource type" is a labeling convention applied by the user.
- The "When to Use" section said HelmRelease objects can overwhelm the helm-controller, but the article's examples shard source-controller. I changed this to HelmRepository and HelmChart source objects, which are reconciled by source-controller.
- The source-controller image tag was pinned to `v1.4.1`, from the older Flux v2.4 release line. I updated the examples to `v1.8.4`, the source-controller version included in Flux v2.8.7.
- The prerequisites said Flux CLI v2.0 or later, which did not align with the updated Flux v2.8 controller image examples. I scoped the prerequisite to Flux CLI v2.8.x for these examples.
- The labeling step covered HelmRepository resources but not generated HelmChart resources. Flux's sharding documentation notes that dependent source objects need matching labels, so I added a minimal HelmRelease snippet showing `.spec.chart.metadata.labels`.

## Review Notes
- The examples use a custom `sharding.fluxcd.io/resource-type` label. Flux's official examples use `sharding.fluxcd.io/key`, but any valid Kubernetes label key can be used as long as all controller selectors and resource labels are consistent.
- The Flux and kubectl binaries were not installed in the review workspace, so command validation was performed against official documentation rather than local `--help` output.
