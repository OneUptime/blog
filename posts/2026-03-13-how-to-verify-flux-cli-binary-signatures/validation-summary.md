# Validation Summary: How to Verify Flux CLI Binary Signatures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- GitHub Releases
- Sigstore Cosign
- SHA256 checksum verification
- Linux and macOS shell commands

## Sources Consulted
- Flux release documentation: https://fluxcd.io/flux/releases/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux v2.2.0 GitHub release assets: https://github.com/fluxcd/flux2/releases/tag/v2.2.0
- Sigstore Cosign blob signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/
- Cosign `verify-blob` command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-blob.md
- Local `sha256sum --help` and `shasum --help` output for checksum verification flags.

## Issues Found
- The binary was downloaded as `flux.tar.gz`, but Flux's checksum file lists the release asset name such as `flux_2.2.0_linux_amd64.tar.gz`. With `--ignore-missing`, this would skip verification instead of checking the downloaded archive. Updated the manual and script examples to save, extract, and clean up the archive using the release asset filename.
- The Linux Cosign install example wrote directly to `/usr/local/bin/cosign` without elevated permissions. Updated it to download locally and use `sudo install -m 0755`.
- The troubleshooting example for a specific certificate identity used `release.yml`, but the Flux v2.2.0 signing certificate identity uses `release.yaml`. Updated the workflow path.

## Review Notes
- Verified the Flux v2.2.0 release contains the referenced checksum, signature, certificate, and Linux AMD64 archive assets.
- Verified `cosign verify-blob` succeeds against the v2.2.0 checksum file using the documented GitHub OIDC issuer and Flux identity regexp.
- Verified the corrected checksum command returns `flux_2.2.0_linux_amd64.tar.gz: OK` and the extracted binary reports `flux: v2.2.0`.
