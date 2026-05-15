# Validation Summary: How to Encrypt Only Specific Fields with SOPS in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Flux CD kustomize-controller
- Kubernetes Secrets and ConfigMaps
- age encryption
- GitOps workflows
- Bash pre-commit hooks

## Sources Consulted
- SOPS README and configuration reference: https://github.com/getsops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux guide for managing Kubernetes secrets with SOPS: https://fluxcd.io/flux/guides/mozilla-sops/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The `.sops.yaml` examples used `path_regex` values matching only `*.enc.yaml`. SOPS matches creation rules against the path of the file being encrypted, so commands like `sops --encrypt secret.yaml > secret.enc.yaml` would match `secret.yaml`, not the redirected output path. Updated the examples to match `*.yaml` and `*.yml` paths so the creation rules apply correctly to the shown workflow.
- The sample `ENC[...]` values included concrete-looking Base64 strings that could be mistaken for deterministic encodings of the original plaintext. SOPS ciphertext is not a simple plaintext Base64 encoding, so the examples now use placeholders for encrypted payload fields.

## Review Notes
- The SOPS selective encryption options and `.sops.yaml` field names are accurate. Official SOPS documentation confirms `encrypted_regex`, `encrypted_suffix`, `unencrypted_regex`, and related options can be configured in `.sops.yaml`.
- The Flux `Kustomization` decryption snippet is accurate for the current `kustomize.toolkit.fluxcd.io/v1` API. Flux documentation confirms `provider: sops` and `secretRef.name`, and notes that Kubernetes Secret `metadata`, `kind`, and `apiVersion` must remain plaintext.
- The pre-commit hook is a basic example. It verifies SOPS metadata for staged `*.enc.yaml` files, but a production-grade hook would need deeper checks to reliably detect all plaintext secret leaks.
