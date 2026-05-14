# Validation Summary: How to Configure SOPS Decryption Provider in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization API
- Kubernetes Secrets
- SOPS
- age
- OpenPGP
- AWS KMS
- Azure Key Vault
- HashiCorp Vault Transit

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post stated that age secrets must use the exact key `age.agekey`. Flux detects age private keys by the `.agekey` suffix, so the wording was changed to say the key must end with `.agekey`.
- The post stated that GPG secrets must use the exact key `sops.asc`. Flux detects OpenPGP keyrings by the `.asc` suffix, so the wording was changed to say the key must end with `.asc`.
- The AWS KMS static credential example used top-level `aws_access_key_id`, `aws_secret_access_key`, and `aws_region` secret entries. Flux expects SOPS AWS KMS credentials under the `sops.aws-kms` secret key, so the example was updated to use a multiline `sops.aws-kms` value.
- The Azure Key Vault static credential example used service principal client secret fields directly at the top level. Current Flux documentation shows object-level SOPS Azure Key Vault credentials under `sops.azure-kv` using application certificate credentials, so the example was corrected.
- The workload identity section implied that omitting `secretRef` alone is sufficient. Current Flux documentation includes `spec.decryption.serviceAccountName` for object-level workload identity, so the example and text were updated.
- The common mistakes section said the decryption secret must be in `flux-system`. Flux requires the secret to be in the same namespace as the Kustomization, so the wording was corrected.

## Review Notes
The Flux `apiVersion`, `kind`, `spec.decryption.provider: sops`, `secretRef`, age secret creation command, Vault token key, multiple Kustomization examples, and Flux CLI verification commands were consistent with current Flux documentation. The post does not mention a Flux version; this review was performed against current Flux documentation available on 2026-05-14.
