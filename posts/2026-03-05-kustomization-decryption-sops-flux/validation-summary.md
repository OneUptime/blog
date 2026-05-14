# Validation Summary: How to Configure Kustomization Decryption with SOPS in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resources
- SOPS
- age encryption
- Kubernetes Secrets
- AWS KMS
- Kustomize

## Sources Consulted
- Flux documentation: Manage Kubernetes secrets with SOPS - https://fluxcd.io/flux/guides/mozilla-sops/
- Flux documentation: Kustomization decryption - https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Flux CLI documentation: flux build kustomization - https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux CLI documentation: flux reconcile kustomization - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- SOPS documentation: Usage, age encryption, .sops.yaml creation rules, encrypted_regex, and in-place encryption - https://getsops.io/docs/

## Issues Found
- The SOPS `path_regex` examples used `.*/secrets/.*\.yaml$`, which does not match a top-level `secrets/database-credentials.yaml` path when evaluated relative to a root `.sops.yaml`. Updated the age and AWS KMS examples to `(^|.*/)secrets/.*\.yaml$` so they match both top-level and nested `secrets/` directories.
- The troubleshooting section said the secret key filename must be exactly `age.agekey`. Flux detects age keys by a `.agekey` suffix, so this was changed to say the secret data key name must end with `.agekey`, with `age.agekey` as an example.

## Review Notes
The main Flux Kustomization decryption fields, SOPS `encrypted_regex` usage, `age-keygen` workflow, Kubernetes Secret creation command, and Flux reconciliation/build commands are consistent with official documentation. The local environment did not have the `flux`, `sops`, or `age-keygen` CLIs installed, so command verification was performed against official CLI documentation rather than local `--help` output.
