# Validation Summary: How to Encrypt ConfigMaps with SOPS for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Kubernetes ConfigMaps
- Kubernetes Secrets
- SOPS
- age encryption keys
- GitOps

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS official documentation / README: https://github.com/getsops/sops
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The selective encryption example repeated `encrypted_regex: ^(data)$`, which encrypts all values under the `data` key rather than only selected ConfigMap entries. Changed it to `encrypted_regex: ^(DATABASE_URL|REDIS_URL)$` so the example targets the sensitive keys shown in the ConfigMap.
- The note after the first encrypted ConfigMap example referred only to `encrypted_regex: ^(data)$` even though the earlier `.sops.yaml` example used `^(data|binaryData)$`. Updated the note to match the broader rule and clarify that matching `data` encrypts all values beneath it.

## Review Notes
Flux's public documentation primarily discusses SOPS decryption for Kubernetes Secrets, but the current Kustomization documentation describes decryption behavior for Kubernetes resources generally and exposes a per-resource `kustomize.toolkit.fluxcd.io/decrypt` policy. The post's recommendation to prefer Kubernetes Secrets for sensitive data is correct, with the caveat that Kubernetes Secret data is base64-encoded by default and still requires appropriate RBAC and, where needed, encryption at rest.
