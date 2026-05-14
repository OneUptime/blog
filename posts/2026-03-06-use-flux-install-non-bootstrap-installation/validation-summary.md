# Validation Summary: How to Use flux install for Non-Bootstrap Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- kubectl
- Docker container registries
- Helm
- Terraform
- Kustomize

## Sources Consulted
- Flux CLI reference for `flux install`: https://fluxcd.io/flux/cmd/flux_install/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux air-gapped installation documentation: https://fluxcd.io/flux/installation/configuration/air-gapped/
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux CLI reference for `flux create source git`: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux CLI reference for `flux create kustomization`: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- fluxcd-community Helm charts repository: https://github.com/fluxcd-community/helm-charts

## Issues Found
- The network policy example incorrectly described `--network-policy=false` as the default. The official `flux install` documentation shows `--network-policy` defaults to true, so the wording was changed to remove the default claim.
- The private registry mirror example used a stale hardcoded `source-controller:v1.2.4` image tag while setting `FLUX_VERSION="v2.4.0"`. The example was updated to derive the source-controller image and tag from `flux install --export`, avoiding a version mismatch.
- The "Resource Limits and Tolerations" subsection claimed resource allocation customization but only showed `--toleration-keys`, which configures scheduling tolerations. The heading and description were narrowed to tolerations and scheduling.

## Review Notes
The remaining Flux CLI flags and examples matched the current official documentation. The Helm chart example is valid for the community-maintained chart repository, though Flux's current installation documentation also shows OCI-based Helm installation as the preferred concise example.
