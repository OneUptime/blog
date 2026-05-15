# Validation Summary: How to Store Database Credentials in Git with SOPS and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- SOPS
- age
- Kubernetes Secrets
- Kubernetes Deployments
- GitOps
- AWS KMS / cloud KMS providers

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux guide, "Manage Kubernetes secrets with SOPS": https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS official documentation: https://github.com/getsops/sops
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The prerequisites listed SOPS but not the age CLI, even though the guide uses `age-keygen`. Added an age CLI prerequisite.
- The illustrative encrypted Secret output used `ENC[...]` `data:` values that resembled base64-encoded plaintext rather than SOPS ciphertext. Replaced them with non-plaintext-looking example ciphertext fragments and added representative `mac` and `encrypted_regex` SOPS metadata fields.

## Review Notes
- The Flux `spec.decryption` configuration, age key Secret name suffix requirement, Kubernetes `stringData`, `envFrom.secretRef`, and `secretKeyRef` examples were consistent with current official documentation.
- When Kubernetes Secret values are consumed as environment variables, updates to the Secret object do not update already-running container environment variables; Pods generally need to restart to receive rotated environment variable values.
