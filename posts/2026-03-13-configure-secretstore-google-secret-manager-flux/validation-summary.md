# Validation Summary: How to Configure SecretStore for Google Secret Manager with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD Kustomization
- Kubernetes ServiceAccount and Secret resources
- External Secrets Operator SecretStore and ExternalSecret
- Google Secret Manager
- Google Kubernetes Engine Workload Identity Federation
- Google Cloud IAM service accounts and roles
- SOPS-encrypted GitOps secrets

## Sources Consulted
- External Secrets Operator Google Cloud Secret Manager provider documentation: https://external-secrets.io/latest/provider/google-secrets-manager/
- External Secrets Operator API specification for GCPSMProvider and GCPWorkloadIdentity: https://external-secrets.io/v0.20.4/api/spec/
- Google Cloud GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The Workload Identity `SecretStore` used `external-secrets.io/v1beta1`. Updated it to the current documented `external-secrets.io/v1` API version.
- The Workload Identity `SecretStore` referenced a Kubernetes service account in the `external-secrets` namespace from a namespaced `SecretStore` in the `default` namespace. ESO documentation only allows the `serviceAccountRef.namespace` pattern for `ClusterSecretStore`; a `SecretStore` uses same-namespace references or the controller pod's own credentials. Removed the per-store auth block so the store uses the annotated ESO controller service account.
- The static key Secret was created in the `external-secrets` namespace while the `SecretStore` that referenced it was in `default`. Moved the Secret to `default` so the namespaced `SecretStore` can resolve it.
- The static key `SecretStore` and test `ExternalSecret` used `external-secrets.io/v1beta1`. Updated them to `external-secrets.io/v1`.
- The service account key JSON example omitted standard fields present in Google-generated service account key files. Expanded the example to include `client_id`, auth/token URIs, and certificate URL fields.
- The GKE Workload Identity setup only enabled the cluster-level workload pool. Added the documented node pool update command for existing Standard node pools and added the IAM Service Account Credentials API prerequisite.
- The `gcloud iam service-accounts create` command did not specify the target project even though the rest of the tutorial uses an explicit project placeholder. Added `--project=MY_PROJECT_ID`.
- The GKE cluster update command used `--region`; changed it to the current documented `--location` form, which works for regional and zonal control planes.

## Review Notes
The Flux `Kustomization` manifest uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `dependsOn`, `sourceRef`, `path`, `interval`, and `prune` fields. The broad project-level `roles/secretmanager.secretAccessor` binding is technically valid, and the post correctly recommends narrowing it with IAM conditions in production.
