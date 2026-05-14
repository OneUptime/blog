# Validation Summary: How to Migrate from Harness to Flux CD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Harness CD
- Kubernetes
- Kustomize
- Helm and Flux HelmRelease
- Flux image automation
- SOPS
- Flagger
- Flux notification controller

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation and API reference: https://fluxcd.io/flux/components/helm/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Flagger install with Flux: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger canary and metrics documentation: https://docs.flagger.app/usage/how-it-works and https://docs.flagger.app/main/usage/metrics
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- SOPS documentation: https://getsops.io/docs/

## Issues Found
- The Flux bootstrap examples used image automation resources later in the post, but the default bootstrap components do not install the image reflector and image automation controllers. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The image automation example needed Git write access when using deploy keys. Added `--read-write-key` to the bootstrap commands.
- The GitHub bootstrap examples used `--personal` with `--owner=your-org`, which is for personal-account repositories, not organization-owned repositories. Removed `--personal`.
- The Deployment image field was missing the Flux image policy marker required by the `Setters` update strategy. Added the `{"$imagepolicy": "flux-system:my-service"}` marker.
- The production Flux Kustomization health check referenced the `production` namespace, but the snippet did not ensure resources were applied there. Added `targetNamespace: production`.
- The Flagger HelmRelease referenced a `flagger` HelmRepository that was not defined and used an older chart source pattern. Added a current OCI HelmRepository, chart version range, and CRD install/upgrade handling.
- The SOPS command could encrypt Kubernetes `apiVersion`, `kind`, or `metadata` values, which Flux does not support for SOPS decryption. Added `--encrypted-regex '^(data|stringData)$'`.
- The SOPS example did not show Flux decryption configuration. Added a Kustomization snippet with `decryption.provider: sops` and `secretRef`.
- The Flux notification Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Provider and Alert documentation uses `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
The examples are now aligned with current Flux and Flagger documentation. In a production migration, teams should still validate provider-specific Flagger settings, secret key management, RBAC, and namespace creation for their own clusters.
