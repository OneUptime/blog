# Validation Summary: How to Use .sops.yaml Configuration File with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Flux CD
- Kubernetes Secrets
- GitOps
- Age
- AWS KMS
- Azure Key Vault
- Google Cloud KMS
- HashiCorp Vault Transit

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS GitHub documentation: https://github.com/getsops/sops
- Flux Kustomization SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/

## Issues Found
- The post stated that `encrypted_regex` controls only top-level YAML keys. SOPS applies `encrypted_regex` to matching keys in the document tree, so this was changed to "YAML keys" while preserving the Kubernetes Secret guidance.
- The post stated that SOPS searches for `.sops.yaml` from the encrypted file's directory. Official SOPS documentation says discovery starts from the current working directory and walks upward, using the first `.sops.yaml` found. The File Placement and Hierarchy section was corrected accordingly.
- The validation example used `sops --decrypt --extract '["sops"]'` to inspect encryption keys. SOPS stores key metadata in the unencrypted `sops:` metadata block, so the command was changed to print that metadata block directly with `sed`.

## Review Notes
The remaining SOPS configuration keys, provider field names, path matching behavior, multiple recipient examples, and Flux recommendation to leave Kubernetes `metadata`, `kind`, and `apiVersion` unencrypted are consistent with the official documentation.
