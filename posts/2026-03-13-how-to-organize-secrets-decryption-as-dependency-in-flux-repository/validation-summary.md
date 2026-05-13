# Validation Summary: How to Organize Secrets Decryption as Dependency in Flux Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Kubernetes
- GitOps
- SOPS
- OpenPGP / GPG keys
- Sealed Secrets
- External Secrets Operator
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#-em-secret-generic-em-
- Local GnuPG CLI help/version output for `gpg --export-secret-keys`.

## Issues Found
- The infrastructure Kustomization pointed only to `./infrastructure/controllers`, while the SOPS key Secret lived under `./infrastructure/sops-gpg`. Changed the infrastructure path to `./infrastructure` and updated the Kustomize example to include both `controllers` and `sops-gpg`, so the referenced `sops-gpg` Secret can actually be reconciled before the secrets layer.
- The SOPS secret example placed encrypted string values under Kubernetes Secret `data`. Kubernetes requires `data` values to be base64 encoded after decryption, so this example could fail if the decrypted values are plain strings. Changed the example to use `stringData`.
- The health check example set `wait: true` and `healthChecks` together. Flux documents that `healthChecks` is ignored when `wait: true` is set. Removed `wait: true` from that explicit health check example and adjusted the conclusion to say to use either `wait: true` or explicit health checks.

## Review Notes
The Flux Kustomization API version `kustomize.toolkit.fluxcd.io/v1`, `dependsOn`, `retryInterval`, `timeout`, `decryption.provider: sops`, and `.spec.decryption.secretRef.name` are current and match Flux documentation. The `kubectl create secret generic ... --from-file=sops.asc=/dev/stdin` command uses a valid `kubectl` flag pattern, and the `.asc` key suffix matches Flux's documented OpenPGP keyring detection.
