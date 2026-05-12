# Validation Summary: How to Provision GCP Infrastructure with Terraform and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tofu Controller (formerly tf-controller) — `infra.contrib.fluxcd.io/v1alpha2`
- Flux CD — Kustomization `kustomize.toolkit.fluxcd.io/v1`
- Terraform (HashiCorp `google` provider)
- Google Cloud Platform: VPC, GKE, Cloud SQL (PostgreSQL)
- Terraform GCS remote backend
- Kubernetes Secrets / `secretKeyRef`
- `gcloud` and `kubectl` CLIs
- GKE Workload Identity, private nodes

## Sources Consulted
- Tofu Controller Terraform CRD reference: https://flux-iac.github.io/tofu-controller/References/terraform/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/
- Terraform `google` provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- HashiCorp support article on `GOOGLE_CREDENTIALS` for containerized runners
- `gcloud iam service-accounts` and `gcloud projects add-iam-policy-binding` command references
- Terraform GCS backend docs (`backend "gcs"`)

## Issues Found
- **`approvePlan: "manual"` is not a documented value.** The Tofu Controller's `approvePlan` field accepts either `"auto"` (auto-apply) or a specific plan ID (e.g., `plan-main-abc123`). Any other value would cause the controller to wait for a plan literally named that string. To require manual approval, the field should be omitted or empty. Fixed in all three Terraform resources (Step 2, Step 3, Step 4) by changing `approvePlan: "manual"` to `approvePlan: ""`.

## Review Notes
- All other Tofu Controller spec fields used (`interval`, `sourceRef`, `path`, `workspace`, `backendConfig.customConfiguration`, `runnerPodTemplate.spec.env`, `vars`, `varsFrom`, `writeOutputsToSecret`, `runnerTerminationGracePeriodSeconds`) are valid and used correctly.
- `GOOGLE_CREDENTIALS` accepts the raw JSON content of a service account key (not just a file path), so injecting it via `secretKeyRef` is correct. (`GOOGLE_APPLICATION_CREDENTIALS` would expect a path.)
- `gcloud` commands and flags are current and correct.
- GCS backend config syntax is correct.
- Cloud SQL `db-custom-4-15360` (4 vCPU / 15360 MB) is a valid custom machine type format; `POSTGRES_15` and `REGIONAL` availability type are valid.
- `n2-standard-4` is a valid GKE node machine type.
- Kubernetes version `1.29` is technically valid input but is approaching end-of-life on GKE channels by mid-2026; readers should consult the current GKE release channel matrix and may prefer a newer version.
- The comment "Create and encode the key" in the bash block is slightly inaccurate — `gcloud iam service-accounts keys create` only writes the JSON; the base64 encoding happens automatically inside `kubectl create secret generic --from-file`. Left unchanged as it is not a functional error.
- The Flux Kustomization uses `prune: false`, which is appropriate for infrastructure resources where accidental deletion is undesirable.
