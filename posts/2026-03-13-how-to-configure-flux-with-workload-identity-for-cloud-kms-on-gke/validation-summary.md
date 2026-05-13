# Validation Summary: How to Configure Flux with Workload Identity for Cloud KMS on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- GKE Workload Identity Federation
- Google Cloud KMS
- Google Cloud IAM
- SOPS
- Kustomize

## Sources Consulted
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://v2-0.docs.fluxcd.io/flux/guides/mozilla-sops/
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud KMS gcloud key creation documentation: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud KMS IAM binding documentation: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/add-iam-policy-binding
- Google Cloud KMS IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/cloudkms
- SOPS documentation: https://github.com/getsops/sops
- SOPS release documentation: https://github.com/getsops/sops/releases

## Issues Found
- The Linux SOPS install command used a fixed `sops-v3.9.0` asset with the `/releases/latest/download/` URL. This can break when the latest release is no longer v3.9.0. Changed it to the versioned `/releases/download/v3.9.0/` URL.
- The `.sops.yaml` example did not restrict encryption to Kubernetes Secret payload fields. Flux documentation notes that `apiVersion`, `kind`, and `metadata` must remain plaintext, and SOPS documentation recommends `encrypted_regex: ^(data|stringData)$` for Kubernetes Secrets. Added `encrypted_regex` to both creation rules and updated the explanatory sentence.

## Review Notes
- The controller-level Workload Identity approach shown in the post is valid for Flux SOPS decryption when the kustomize-controller service account is annotated and the Kustomization does not specify a decryption `serviceAccountName`.
- In GKE Standard clusters, workloads must run on node pools using the GKE metadata server for Workload Identity Federation to work. The post's prerequisite says Workload Identity is enabled, but future revisions could make this node pool detail explicit.
