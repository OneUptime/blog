# Validation Summary: How to Configure Crossplane Provider Credentials with Flux SOPS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Crossplane
- SOPS
- age
- Kubernetes Secrets
- kubectl
- GitOps

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- SOPS project documentation and release artifacts: https://github.com/getsops/sops
- SOPS releases: https://github.com/getsops/sops/releases
- Crossplane AWS provider quickstart: https://docs.crossplane.io/v1.20/getting-started/provider-aws/
- Crossplane provider concepts documentation: https://docs.crossplane.io/v1.20/concepts/providers/
- Kubernetes kubectl command reference for `kubectl create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- age releases: https://github.com/FiloSottile/age/releases

## Issues Found
- The Linux SOPS install command used `https://github.com/getsops/sops/releases/latest/download/sops-v3-linux.amd64`, but current SOPS release assets include the version in the filename, such as `sops-v3.12.2.linux.amd64`. Updated the command to set `SOPS_VERSION=v3.12.2` and download the matching versioned asset.
- The SOPS encryption examples did not restrict encryption to Kubernetes Secret payload fields. Flux documentation says `metadata`, `kind`, and `apiVersion` must remain plaintext, and recommends encrypting only `data` and `stringData`. Added `encrypted_regex: '^(data|stringData)$'` to the `.sops.yaml` examples and `--encrypted-regex '^(data|stringData)$'` to the direct `sops --encrypt` command.
- The age key cleanup comments said to delete the local key file while also recommending a backup. Reordered the comments so the backup is created before local deletion.

## Review Notes
- The Crossplane Secret example is technically valid as a Kubernetes Secret, but the Crossplane ProviderConfig must reference the same secret name, namespace, and key (`credentials`) for a real deployment.
- The SOPS version in the Linux install command should be refreshed when the post is updated in the future.
