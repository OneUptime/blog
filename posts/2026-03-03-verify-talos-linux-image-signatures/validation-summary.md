# Validation Summary: How to Verify Talos Linux Image Signatures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Sidero Labs Image Factory
- Sigstore cosign
- Sigstore Rekor
- SHA256 checksum verification
- Talos SBOMs
- talosctl

## Sources Consulted
- Talos v1.9 Verifying Images documentation: https://docs.siderolabs.com/talos/v1.9/security/verifying-images
- Talos Verifying Image Signatures documentation: https://docs.siderolabs.com/talos/v1.13/security/verifying-image-signatures
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/image-factory
- Talos SBOM documentation: https://docs.siderolabs.com/talos/v1.11/advanced-guides/SBOM
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sigstore cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Rekor CLI documentation: https://docs.sigstore.dev/logging/cli/
- Sidero Labs Talos GitHub releases: https://github.com/siderolabs/talos/releases
- Sigstore cosign GitHub releases: https://github.com/sigstore/cosign/releases

## Issues Found
- The post described Talos release artifacts generally as signed with cosign. Updated this to specify Talos release container images, matching Talos documentation.
- The cosign verification examples used GitHub Actions OIDC identity values. Replaced them with the Sidero Labs signing identity pattern and Google OIDC issuer documented for Talos v1.9 release images.
- The public-key verification section referenced `https://github.com/siderolabs/talos/raw/main/cosign.pub`, which does not exist. Replaced it with identity-based verification, which is the documented Talos verification method.
- The ISO/raw image section referenced `sha256sum.txt.sig`, which is not present in the Talos v1.9.0 release assets. Removed the signature verification command and kept checksum verification against the published `sha256sum.txt`.
- The Image Factory verification command used the wrong OIDC identity. Updated it to the documented Image Factory signing service account.
- The shell script used `$1` and `$2` under `set -u`, which would fail before the usage check if arguments were omitted. Changed the assignments to `${1:-}` and `${2:-}`.
- The SBOM example used `cosign download sbom` and CycloneDX-style `.components` fields for a Talos v1.9.0 image. Updated it to download a published Talos SPDX SBOM and inspect `.packages`.
- The Rekor example used `rekor-cli search --email`, which is not a supported search form in the Rekor CLI documentation. Replaced it with a SHA256-based search command.
- The troubleshooting examples still referenced public-key verification with `cosign.pub`. Updated them to use the documented keyless identity checks.

## Review Notes
Live verification with cosign v3.0.6 succeeded for `ghcr.io/siderolabs/installer:v1.9.0`, `ghcr.io/siderolabs/talos:v1.9.0`, and the vanilla Image Factory installer image for Talos v1.9.0. Talos v1.9.0 itself does not publish the newer SPDX SBOM assets; the SBOM example therefore uses v1.11.0, where those assets are present.
