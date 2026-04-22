# Validation Summary: How to Generate SBOMs in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes kubectl and JSONPath
- Syft
- Trivy
- GitHub Actions
- Sigstore Cosign
- SPDX and CycloneDX SBOM formats

## Sources Consulted
- Anchore Syft installation documentation: https://oss.anchore.com/docs/installation/syft/
- Anchore Syft output format documentation: https://oss.anchore.com/docs/guides/sbom/formats/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes task for listing running container images: https://v1-34.docs.kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/
- Trivy SBOM documentation: https://trivy.dev/docs/latest/supply-chain/sbom/
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- Sigstore Cosign attach SBOM command documentation: https://github.com/sigstore/cosign/blob/main/doc/cosign_attach_sbom.md
- Sigstore Cosign attest command documentation: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md

## Issues Found
- The Syft install command used the older raw GitHub install script URL and omitted `sudo` while installing to `/usr/local/bin`. Updated it to Anchore's current documented installer URL and command.
- The Kubernetes image-listing command did not write `images.txt`, but the next loop read from `images.txt`. Updated the command to save the sorted image list to that file.
- The image-listing command claimed to list running images but did not restrict pods by phase. Added `--field-selector=status.phase=Running`.
- The GitHub Actions example used `actions/upload-artifact@v3`, which is deprecated for GitHub.com workflows. Updated it to the current documented major version.
- The Trivy section said the shown SPDX SBOM command included vulnerability correlation. The documented vulnerability inclusion flow is separate, so the wording was narrowed to SBOM generation.
- The Cosign example used the deprecated `cosign attach sbom` command and a mutable tag. Replaced it with `cosign attest` using an SPDX JSON predicate and an immutable digest-form image reference.

## Review Notes
- The guide is technically valid after the fixes. Future improvements could mention that ConfigMaps are only practical for small SBOMs and that storing SBOM attestations requires registry write access and a Cosign signing identity.
