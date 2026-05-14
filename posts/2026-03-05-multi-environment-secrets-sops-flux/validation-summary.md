# Validation Summary: How to Configure Multi-Environment Secrets with SOPS and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- SOPS
- age encryption keys
- GitOps secret management
- YAML configuration
- kubectl CLI
- Flux CLI

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS GitHub documentation: https://github.com/getsops/sops
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes kubectl reference for `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- age-keygen manual: https://man.archlinux.org/man/extra/age/age-keygen.1.en

## Issues Found
- The single-value update command used `sops --set`, but current SOPS documentation uses the `sops set <file> <path> <json-value>` subcommand. Updated the example to `sops set clusters/production/secrets/database.yaml '["stringData"]["password"]' '"new-password-here"'`.
- The encryption key update loop used `sops updatekeys --yes`. SOPS documentation shows `-y` as the non-interactive flag for `updatekeys`, so the examples now use `sops updatekeys -y`.
- The key rotation workflow removed the old key from `.sops.yaml` without updating existing encrypted files afterward. Added a second `sops updatekeys -y` loop after removing the old recipient so encrypted files no longer include the old recipient.
- The verification command used `flux get kustomization production-secrets`, but the current Flux CLI documentation exposes `flux get kustomizations`. Updated the command accordingly.

## Review Notes
- The Flux Kustomization `decryption.provider: sops` and `secretRef.name` fields are current for `kustomize.toolkit.fluxcd.io/v1`.
- Flux requires age private key entries in the referenced Secret to use a key name ending in `.agekey`; the post's `--from-file=age.agekey=...` examples satisfy this requirement.
- SOPS documentation recommends rotating the data key when removing keys. The corrected workflow removes the old recipient from files, but future revisions could add an explicit note about data key rotation for stricter key compromise handling.
