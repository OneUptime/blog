# Validation Summary: How to Configure Flux CD with Google Cloud KMS for SOPS Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD kustomize-controller and Kustomization resources
- SOPS
- Google Cloud KMS
- GKE Workload Identity Federation
- Kubernetes Secrets and service accounts
- gcloud, kubectl, and Flux CLI commands

## Sources Consulted
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Kustomization SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile kustomization documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- SOPS official documentation: https://github.com/getsops/sops
- Google Cloud KMS create key documentation: https://docs.cloud.google.com/kms/docs/create-key
- gcloud kms keys create reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- gcloud kms encrypt reference: https://cloud.google.com/sdk/gcloud/reference/kms/encrypt
- gcloud kms decrypt reference: https://cloud.google.com/sdk/gcloud/reference/kms/decrypt
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The introduction stated that Google Cloud KMS keys are managed by hardware security modules. The provided commands create a default software-protected Cloud KMS key unless `--protection-level hsm` is specified, so the wording was changed to say the keys are managed by Google Cloud KMS.
- The service account key fallback created the Flux Secret with `sops.gcp-credentials`. Flux expects GCP KMS service account JSON credentials under the fixed key `sops.gcp-kms`, so the `kubectl create secret` command was corrected.
- The troubleshooting debug pod tested `gcloud kms encrypt` even though the Flux service account is granted only `roles/cloudkms.cryptoKeyDecrypter`. The command was changed to create ciphertext with local credentials and test `gcloud kms decrypt` from the debug pod.

## Review Notes
The Workload Identity configuration shown uses IAM service account impersonation for the Flux `kustomize-controller` service account, which matches GKE and Flux controller-level authentication guidance. The Flux `decryption.provider: sops` examples and omission of `secretRef` for Workload Identity are consistent with current Flux documentation.
