# Validation Summary: How to Encrypt Secrets with SOPS and GPG for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD kustomize-controller
- SOPS
- GPG / OpenPGP
- Kubernetes Secrets
- GitOps
- kubectl

## Sources Consulted
- Flux: Manage Kubernetes secrets with SOPS: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Kustomization decryption reference: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- SOPS official documentation: https://getsops.io/docs/
- GnuPG unattended key generation manual: https://gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
- Local GnuPG 2.4.4 CLI help and isolated batch key-generation test

## Issues Found
- The GPG fingerprint extraction command placed `--with-colons` after the key name. In the tested GnuPG 2.4.4 CLI, this produced human-readable output instead of colon-delimited output, so the `awk -F:` expression returned an empty `KEY_FP`. Moved `--with-colons` before `--list-secret-keys` so the command emits parseable colon-delimited output and returns the generated key fingerprint.

## Review Notes
- Flux's current documentation confirms that SOPS is the supported decryption provider, OpenPGP key entries in the referenced Kubernetes Secret must use a `.asc` key suffix, and encrypting only `data` / `stringData` is the recommended pattern for Kubernetes Secret manifests.
- SOPS and Flux documentation now generally recommend age over OpenPGP for new setups, but OpenPGP/GPG remains supported and appropriate where existing PGP infrastructure is required.
