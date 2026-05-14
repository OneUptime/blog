# Validation Summary: How to Validate SOPS Encrypted Files for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD kustomize-controller
- SOPS
- age and OpenPGP keys
- Kubernetes Secrets and manifests
- kubectl
- Bash
- GitHub Actions
- Python / PyYAML

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Flux kustomize-controller overview: https://fluxcd.io/flux/components/kustomize/
- SOPS README and CLI examples: https://github.com/getsops/sops
- SOPS releases and binary installation examples: https://github.com/getsops/sops/releases
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout README: https://github.com/actions/checkout

## Issues Found
- The validation scripts used `find ... | while read ...`, which runs the loop in a subshell in Bash. This meant `ERRORS=$((ERRORS + 1))` updates were lost and the scripts could report success after detecting failures. Changed each script to use process substitution with `while ...; done < <(find ...)`.
- The SOPS structure check only inspected one line after `data:` and did not check `stringData:` values. Replaced it with an `awk` check that scans entries under both `data` and `stringData` until the next top-level key.
- The Kubernetes validation script imported `yaml` without making the PyYAML dependency explicit. Added PyYAML to prerequisites, installed it in the GitHub Actions workflow, and changed the Python one-liner to pass the decrypted path as an argument instead of interpolating it into the code string.
- The temporary directory cleanup trap did not quote the temporary path. Updated the trap to quote `TEMP_DIR`.
- The GitHub Actions example claimed to install the latest SOPS binary while pinning old SOPS v3.8.1. Updated the example to SOPS v3.13.0, the latest release shown on the official SOPS releases page during review, and removed the inaccurate "latest" wording.
- Updated `actions/checkout` from v4 to v6 to match the current official action README usage.

## Review Notes
- Flux `spec.decryption.provider: sops`, `secretRef.name`, and the requirement to leave `apiVersion`, `kind`, and `metadata` unencrypted are consistent with the official Flux documentation.
- `kubectl apply --dry-run=client -f` remains a valid kubectl command, but future hardening could use server-side dry-run in CI when access to an appropriate cluster API is available.
