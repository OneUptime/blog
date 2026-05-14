# Validation Summary: How to Fix 'SOPS decryption failed' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux CLI
- SOPS
- age encryption keys
- OpenPGP/GPG keys
- Kubernetes Secrets
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux guide, "Manage Kubernetes secrets with SOPS": https://fluxcd.io/flux/guides/mozilla-sops/
- Flux CLI reference, `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI reference, `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux GitRepository artifact documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- SOPS documentation: https://github.com/getsops/sops
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The re-encryption command in Cause 2 did not specify `--encrypted-regex`, which could encrypt Kubernetes manifest fields such as `apiVersion`, `kind`, or `metadata`. Flux documentation states these fields must remain plaintext. Added `--encrypted-regex '^(data|stringData)$'` to the command.
- Cause 3 incorrectly stated that SOPS needs `.sops.yaml` to decrypt files. SOPS decryption uses metadata embedded in the encrypted file; `.sops.yaml` is used for encryption rules and `sops updatekeys`. Updated the heading and explanation to reflect that Flux depends on each file's `sops` metadata.
- Cause 5 used `kubectl exec` into `source-controller` and listed an internal `/data/gitrepository/...` path. Flux documents GitRepository artifacts as tarballs exposed through artifact status, and local build inspection should use Flux CLI workflows. Replaced the command with sourceRef inspection and `flux build kustomization`.
- The key rotation example used interactive `sops updatekeys` in a `find -exec` loop, which is not practical for batch usage. Added `-y` to make the command non-interactive.
- The manual re-encryption pipeline encrypted `/dev/stdin` without `--filename-override`, which can prevent `.sops.yaml` creation rules from matching the original file path. Added `--filename-override "$file"` and kept explicit YAML input/output types.

## Review Notes
The remaining Flux Kustomization snippets use the current `kustomize.toolkit.fluxcd.io/v1` API and valid `spec.decryption.provider: sops` / `secretRef.name` fields. The age and OpenPGP secret key suffixes are consistent with Flux documentation: `.agekey` for age private keys and `.asc` for armored OpenPGP keyrings. The examples assume the Kustomization and decryption secret are in the same namespace, which matches the Flux examples shown in the post.
