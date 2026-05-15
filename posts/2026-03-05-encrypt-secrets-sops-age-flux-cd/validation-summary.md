# Validation Summary: How to Encrypt Secrets with SOPS and Age for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- SOPS
- Age encryption
- Kubernetes Secrets
- kubectl
- GitOps

## Sources Consulted
- Flux CD SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CD CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- SOPS official repository documentation: https://github.com/age-sops/sops
- Age official repository documentation: https://github.com/FiloSottile/age
- age-keygen manual page: https://man.archlinux.org/man/extra/age/age-keygen.1.en
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl command reference for `create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post used `flux get kustomizations my-app` in the verification and troubleshooting examples. Current Flux CLI documentation shows `flux get kustomizations` accepts flags rather than a positional Kustomization name. Updated both examples to `flux get kustomizations --namespace=flux-system`, which matches the documented command and the namespace used by the tutorial's Kustomization resource.

## Review Notes
- The SOPS and Age workflow matches the official Flux guide, including storing the Age private key in a Kubernetes Secret with a `.agekey` key name, using `--encrypted-regex '^(data|stringData)$'`, and configuring `spec.decryption.provider: sops`.
- The Kubernetes Secret example uses `stringData`, which is valid for manifests and is converted into `data` by the Kubernetes API server.
