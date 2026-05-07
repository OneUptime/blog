# Validation Summary: How to Configure Image Trust Policies in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers/image trust policy configuration
- `/etc/containers/policy.json`
- `/etc/containers/registries.d/*.yaml`
- GPG image signing
- Sigstore/cosign image signing

## Sources Consulted
- Podman `podman-image-trust` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- containers/image `containers-policy.json(5)` official documentation: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- containers/image `containers-registries.d(5)` official documentation: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md

## Issues Found
- Corrected the policy file lookup explanation. The containers/image documentation says the user policy is used if it exists; otherwise the system policy is used.
- Added `signedIdentity: {"type": "matchRepository"}` to the Sigstore/cosign policy example because the official policy documentation notes that cosign-created signatures contain a repository identity and should use repository-based identity matching.
- Replaced invalid `registries.d` keys `sigstore` and `sigstore-staging` with the documented `lookaside` and `lookaside-staging` keys.
- Added `use-sigstore-attachments: true` for the Sigstore attachment example because the official policy documentation requires this option for registry-hosted Sigstore attachments.
- Added the required `--signature-policy /etc/containers/policy.json` option to `podman image trust set` commands, matching current Podman documentation.

## Review Notes
Podman was not installed in the review workspace, so CLI behavior was verified against the official Podman command documentation rather than local `--help` output.
