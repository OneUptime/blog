# Validation Summary: How to Encrypt Secrets with SOPS and Google Cloud KMS for Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD Kustomization and SOPS decryption
- SOPS
- Google Cloud KMS
- Google Kubernetes Engine Workload Identity Federation
- Kubernetes Secrets and service accounts
- Google Cloud CLI

## Sources Consulted
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Google Cloud Platform integration documentation: https://fluxcd.io/flux/integrations/gcp/
- SOPS README and `.sops.yaml` creation rule documentation: https://github.com/getsops/sops
- Google Cloud SDK `gcloud kms keys create` documentation: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK `gcloud kms keys add-iam-policy-binding` documentation: https://cloud.google.com/sdk/gcloud/reference/kms/keys/add-iam-policy-binding
- Google Kubernetes Engine Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The repository-level `.sops.yaml` example matched `*.enc.yaml`, but the command encrypted `secret.yaml` to stdout. SOPS creation rules are selected from the file path being encrypted, so the rule would not be applied to `secret.yaml`. Changed the command to copy `secret.yaml` to `secret.enc.yaml` first and then run `sops --encrypt --in-place secret.enc.yaml`, which matches the configured `path_regex`.
- Flux documents that when the Workload Identity annotation is applied after bootstrap, the controller should be restarted for the binding to take effect. Added a `kubectl rollout restart deployment/kustomize-controller --namespace flux-system` command after annotating the service account.

## Review Notes
The Flux Kustomization `apiVersion`, `spec.decryption.provider`, `secretRef` usage for static GCP service account keys, and `sops.gcp-kms` secret key name match current Flux documentation. The Cloud KMS key creation and IAM binding command forms are consistent with Google Cloud CLI documentation. The GKE Workload Identity impersonation flow shown is valid, though current Google Cloud guidance also supports granting IAM roles directly to Kubernetes service account principals in some cases.
