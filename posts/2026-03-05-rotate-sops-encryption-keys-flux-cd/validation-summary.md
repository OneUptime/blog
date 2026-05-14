# Validation Summary: How to Rotate SOPS Encryption Keys in Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD kustomize-controller and Flux CLI
- Mozilla SOPS
- age encryption keys
- OpenPGP / GnuPG keys
- Kubernetes Secrets and kubectl
- AWS KMS, GCP KMS, and Azure Key Vault SOPS configuration

## Sources Consulted
- SOPS README - Adding and removing keys, `updatekeys`, `rotate`, and `.sops.yaml` configuration: https://github.com/getsops/sops
- Flux Kustomization documentation - SOPS decryption providers, Secret key suffixes, and controller decryption behavior: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation - `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl reference - `kubectl create secret generic`, `--from-file`, and `--dry-run=client`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- GnuPG manual - unattended key generation and supported ECC parameters: https://gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
- AWS KMS documentation - `EnableKeyRotation` behavior and constraints: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html

## Issues Found
- The post treated `sops updatekeys` as full key rotation. SOPS documents `updatekeys` as synchronizing recipient keys from `.sops.yaml`, while `sops rotate -i` renews the data key. I updated the final key-removal steps and automation script to run `sops rotate -i` after `sops updatekeys`.
- The Age Kubernetes Secret update deleted and recreated the Secret, which can create a temporary gap while Flux is reconciling. I changed the examples to use `kubectl create secret generic --dry-run=client -o yaml | kubectl apply -f -`.
- The cloud KMS section implied AWS automatic key rotation required changing `.sops.yaml`. AWS automatic key-material rotation keeps the same key ID/ARN, so I clarified that it is provider-managed and does not change the SOPS key ARN.
- The post did not mention that SOPS uses provider-specific `.sops.yaml` fields for non-AWS KMS providers. I added the correct `gcp_kms` and `azure_keyvault` field names.
- The automation script iterated over `find` output with word splitting, which breaks on paths containing whitespace. I updated it to use `find -print0` with a null-delimited read loop.
- The verification command `flux reconcile kustomization --all` is not a valid Flux CLI form. I replaced it with a `kubectl get ... -A` loop that reconciles each Kustomization by namespace and name.

## Review Notes
- The Age recipient format, `.sops.yaml` `age` and `pgp` fields, `encrypted_regex: ^(data|stringData)$`, and Flux Secret suffixes such as `.agekey` and `.asc` are consistent with official documentation.
- The GnuPG batch example uses supported unattended key generation parameters for an Ed25519 primary key and Cv25519 encryption subkey.
- The GPG rotation section shows adding the new key and updating the cluster Secret, but relies on the Age section's "same pattern" wording for the final old-key removal step.
