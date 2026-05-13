# Validation Summary: How to Handle Cluster-Specific Secret Keys with Flux and SOPS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API and kustomize-controller
- Kubernetes Secrets and ServiceAccounts
- SOPS
- age encryption keys
- AWS KMS and EKS IRSA
- GitOps multi-cluster secret management

## Sources Consulted
- Flux: Manage Kubernetes secrets with SOPS, https://fluxcd.io/flux/guides/mozilla-sops/
- Flux: Kustomization API documentation, including decryption and post-build substitution, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI: `flux reconcile` command reference, https://fluxcd.io/flux/cmd/flux_reconcile/
- SOPS official documentation, including `.sops.yaml`, `updatekeys`, `rotate`, and `set`, https://github.com/getsops/sops
- age `age-keygen` manual, including `-o` and `-y` behavior, https://man.archlinux.org/man/extra/age/age-keygen.1.en

## Issues Found
- The repository tree placed `.sops.yaml` under `infrastructure/secrets/` while the text said to create it at the repository root and the rules used repository-root-relative paths. Moved `.sops.yaml` to the repository root in the example tree so SOPS can discover it from the repo and match the documented paths.
- The public key extraction used `grep` against the generated private key file. Replaced it with `age-keygen -y <keyfile>`, which is the documented way to derive a recipient from an age identity file.
- The secret rotation comment described `sops <file>` as "decrypt in place." Clarified that SOPS opens a decrypted editor view and re-encrypts on save.
- The key rotation example used interactive `sops updatekeys` in a `find -exec` loop and did not rotate the data key. Updated it to use `sops updatekeys -y`, set the relevant `SOPS_AGE_KEY_FILE`, and run `sops rotate -i` for each file.
- The post-build substitution section implied a SOPS-encrypted Secret could be used directly as a variable source by the same Kustomization. Clarified that `substituteFrom` reads an already existing in-cluster ConfigMap or Secret in the Kustomization namespace, so that Secret should be reconciled separately first.
- The introduction described storing secrets in Git as a fundamental GitOps requirement. Changed this to "common requirement" to avoid overstating GitOps requirements.

## Review Notes
Most Flux Kustomization fields, SOPS creation rules, decryption Secret key naming, Kubernetes Secret examples, and CLI examples were consistent with current official documentation. The post still uses "Mozilla SOPS" in title/tag-style prose; the current upstream project is `getsops/sops`, but the Flux documentation still uses a "Mozilla SOPS" guide URL, so this is not a blocking technical issue.
