# Validation Summary: How to Provision AWS Infrastructure with Terraform and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tofu Controller (formerly tf-controller) — `infra.contrib.fluxcd.io/v1alpha2` Terraform CRD
- Flux CD — Kustomize controller (`kustomize.toolkit.fluxcd.io/v1`)
- Terraform / OpenTofu
- AWS (VPC, EKS, RDS for PostgreSQL)
- Kubernetes Secrets for inter-module output passing
- S3 + DynamoDB remote state backend
- `kubectl` and `flux` CLIs

## Sources Consulted
- Tofu Controller Terraform CRD reference: https://flux-iac.github.io/tofu-controller/References/terraform/
- Tofu Controller `terraform_types.go` (v1alpha2): https://github.com/flux-iac/tofu-controller/blob/main/api/v1alpha2/terraform_types.go
- Tofu Controller plan-and-manually-apply docs: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- Flux Kustomize v1 API: https://fluxcd.io/flux/components/kustomize/api/v1/
- AWS EKS supported Kubernetes versions documentation
- AWS RDS for PostgreSQL supported versions

## Issues Found

1. **Non-standard `approvePlan: "manual"` value (fixed).**
   The Tofu Controller's `approvePlan` field only recognizes two named string constants in source: `"auto"` (`ApprovePlanAutoValue`) and `"disable"` (`ApprovePlanDisableValue`). Any other non-empty value is treated as a plan revision ID to approve. The documented way to require manual approval is to leave the field as `""` (empty string) or omit it entirely. While `"manual"` would functionally behave like manual approval (it never matches a real plan ID), it is not documented and could confuse readers about the actual API contract. Replaced all three occurrences with `approvePlan: ""` and added a clarifying comment in the VPC example. Best Practices bullet updated to match.

2. **Misleading "get the kubeconfig" comment (fixed).**
   The bash comment in Step 6 read `# After EKS is ready, get the kubeconfig`, but the command that follows only extracts the cluster API endpoint from the outputs Secret — it does not produce a kubeconfig (which would additionally require the CA data and an auth mechanism such as `aws eks update-kubeconfig`). Changed the comment to `# After EKS is ready, get the cluster API endpoint` to match what the command actually does.

## Review Notes
- All other tf-controller spec fields used in the post (`storeReadablePlan: human`, `runnerTerminationGracePeriodSeconds`, `varsFrom` with `varsKeys`, `writeOutputsToSecret.outputs`, `backendConfig.customConfiguration`, `vars` with JSON-encoded list values) verified against the v1alpha2 CRD source as correct.
- `kustomize.toolkit.fluxcd.io/v1` is the current GA API version for Flux Kustomization.
- Kubernetes 1.29 is still in EKS extended support as of May 2026 but is no longer in standard support; readers deploying new clusters may prefer 1.31+ for a longer support window. Left as-is since it remains a valid, working version.
- PostgreSQL 15.4 is supported but not the latest minor in the 15.x series (newer 15.x patches and 16.x/17.x are available). Left as-is since the exact minor version is illustrative.
- Step 5 ("Create Flux Kustomizations with Ordering") only shows a single Kustomization that recursively applies the entire `./infrastructure/terraform/aws` directory; the inter-resource ordering (VPC → EKS / RDS) is achieved at the Terraform-resource level via `writeOutputsToSecret` + `varsFrom` (each downstream resource waits for the upstream's outputs Secret to be populated), rather than via Flux Kustomization `dependsOn`. The mechanism works, but the heading slightly oversells the role of Flux Kustomization ordering. Not a technical error, so left unchanged.
- The Kustomization resource is named `aws-vpc` even though it applies VPC + EKS + RDS, which is slightly misleading naming but not a technical defect. Left unchanged per instructions to avoid stylistic edits.
- The Best Practices bullet recommends a 20-minute `runnerTerminationGracePeriodSeconds` for RDS but the RDS example does not set it; this is a non-binding recommendation rather than a contradiction.
