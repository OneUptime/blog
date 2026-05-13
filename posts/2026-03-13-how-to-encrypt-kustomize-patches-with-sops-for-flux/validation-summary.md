# Validation Summary: How to Encrypt Kustomize Patches with SOPS for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Kubernetes
- Kustomize
- SOPS
- age encryption
- Kubernetes Secrets

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- SOPS official documentation: https://github.com/getsops/sops

## Issues Found
- The original post claimed that Flux decrypts arbitrary SOPS-encrypted Kustomize patch files before Kustomize applies them. Flux documentation describes SOPS decryption for Kubernetes Secret data and generated Secret values, so I changed the workflow to store sensitive values in SOPS-encrypted Kubernetes Secret manifests and use plain Kustomize patches with `secretKeyRef`.
- The `.sops.yaml` examples encrypted keys such as `value` and `env`, which would encrypt fields inside Deployment patches and leave Kustomize/Flux with non-Secret encrypted values. I changed the examples to encrypt only `data` and `stringData`, matching Flux guidance that `apiVersion`, `kind`, and `metadata` stay readable.
- The Kustomize examples used `patchesStrategicMerge`, which is deprecated in current Kustomize usage. I replaced it with the current `patches` field using `path` entries.
- The JSON patch example was not actually a JSON patch; it was a Kubernetes Secret containing JSON content. I corrected the wording and filenames to describe it as encrypted JSON Secret data.
- The common-issues section said Flux removes the SOPS metadata block before passing files to Kustomize. I replaced that with the accurate guidance that patch files should remain plain YAML and only Secret `data` or `stringData` values should be SOPS-encrypted.

## Review Notes
The corrected post preserves the intended GitOps workflow while aligning it with Flux's documented SOPS support. The local environment did not have `flux`, `sops`, or `kustomize` installed, so command verification was performed against official documentation rather than local CLI help.
