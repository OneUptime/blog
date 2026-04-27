# Validation Summary: OpenTofu vs Crossplane: Choosing the Right Infrastructure Provisioning Tool

## Status
validated

## Post Type
Comparison guide / decision-making guide

## Technologies Covered
- OpenTofu (HCL, CLI workflow)
- Crossplane (Kubernetes-native control plane)
- Crossplane CompositeResourceDefinition (XRD) / Composite Resources
- AWS provider for Terraform/OpenTofu (`aws_db_instance`, `aws_eks_cluster`, `helm_release`)
- Crossplane AWS provider (RDS DBInstance)
- Kubernetes (CRDs, controllers, etcd)
- Helm (Crossplane chart installation)
- GitOps tools mentioned: Argo CD, Flux

## Sources Consulted
- HashiCorp AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Crossplane official docs: https://docs.crossplane.io/latest/
- Crossplane install docs: https://docs.crossplane.io/latest/get-started/install/
- crossplane-contrib/provider-aws (legacy provider) RDS API references for `rds.aws.crossplane.io/v1alpha1` `DBInstance`
- Upbound provider-family-aws (`provider-aws-rds`) documentation for `rds.aws.upbound.io/v1beta1` `Instance`
- Crossplane CompositeResourceDefinition schema (apiextensions.crossplane.io/v1)

## Issues Found

1. **Incorrect Terraform/OpenTofu RDS resource name.**
   - The OpenTofu code example used `aws_rds_instance` for the AWS provider RDS resource. This resource does not exist in the HashiCorp AWS provider — the correct resource type is `aws_db_instance` (`aws_rds_cluster` exists for Aurora, but not `aws_rds_instance`).
   - **Fix:** Renamed `resource "aws_rds_instance" "db"` to `resource "aws_db_instance" "db"`.

2. **CompositeResourceDefinition example missing required fields.**
   - The XRD YAML omitted `spec.names.plural` (required, must equal the CRD name's prefix).
   - The version entry was missing `served: true` and `referenceable: true` — both are required by the Crossplane XRD schema, and exactly one version must be `referenceable: true`.
   - **Fix:** Added `plural: xpostgresqlinstances` under `spec.names`, and added `served: true` and `referenceable: true` to the version entry.

## Review Notes

- The Crossplane RDS example uses `apiVersion: rds.aws.crossplane.io/v1alpha1` with `kind: DBInstance` and field `dbInstanceClass`. This is technically valid against the older `crossplane-contrib/provider-aws` (where this API group/kind exists). It is **not** the same as the newer Upbound family provider (`rds.aws.upbound.io/v1beta1` `Instance` with `instanceClass`), which is the recommended provider in 2026. Readers adopting Crossplane today will likely use the Upbound family providers and should consult current provider docs for exact field names. Left the example as-is since it is valid for a real provider.
- The "3,000+ providers" claim for OpenTofu is reasonable — the OpenTofu Registry mirrors most of the Terraform Registry's provider catalog, which is in that range.
- The Crossplane Helm repository URL (`https://charts.crossplane.io/stable`) is correct.
- The sample claim/XR usage shows applying an `XPostgreSQLInstance` directly (a Composite Resource), rather than a Claim. For true app-team self-service, Crossplane Claims are typically preferred (defined via `claimNames` in the XRD); this is a simplification but not technically wrong.
- All `tofu` CLI commands (`tofu plan`, `tofu apply`, `tofu destroy`) are valid.
- Drift correction characterization (manual for OpenTofu, continuous for Crossplane controllers) is accurate.
