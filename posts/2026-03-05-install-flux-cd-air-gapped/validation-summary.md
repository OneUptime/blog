# Validation Summary: How to Install Flux CD in an Air-Gapped Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Air-gapped Kubernetes installation
- Container image mirroring with crane and Docker
- Flux GitRepository and Kustomization custom resources

## Sources Consulted
- Flux air-gapped installation documentation: https://fluxcd.io/flux/installation/configuration/air-gapped/
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux v2.8.7 GitHub release metadata: https://api.github.com/repos/fluxcd/flux2/releases/latest
- Flux v2.8.7 install manifest: https://github.com/fluxcd/flux2/releases/download/v2.8.7/install.yaml

## Issues Found
- The post hardcoded four Flux controller images. Current Flux manifests can contain additional images, and the official air-gapped guidance recommends deriving the image list from the generated manifests. I changed the crane and Docker examples to use `flux-images.txt`, generated from `gotk-components.yaml`, so every required image is mirrored.
- The example output listed `helm-controller:v2.x.x`, but current Flux v2.8.x uses `helm-controller:v1.x.x`. I corrected the sample output.
- The Flux CLI download used `releases/latest/download/flux_2.4.0_linux_amd64.tar.gz`, which now redirects to the latest release and returns 404 because the asset name no longer matches. I changed it to a versioned v2.8.7 release URL and updated the extraction command.
- The TLS section used `certSecretRef` on a GitRepository. Current Flux GitRepository authentication expects Git HTTPS CA data in the Secret referenced by `.spec.secretRef`, and `flux create secret git` supports `--ca-crt-file`. I updated the command and removed the invalid `certSecretRef` field from the GitRepository example.

## Review Notes
- The post is technically relevant and remains a useful air-gapped Flux installation guide after correction.
- If the internal registry requires authentication, operators will also need to configure image pull credentials for Flux controller pods or the node/container runtime trust and credential chain. That is outside the current post's minimal unauthenticated registry example.
