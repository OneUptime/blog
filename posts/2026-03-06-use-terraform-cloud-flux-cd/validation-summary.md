# Validation Summary: How to Use Terraform Cloud with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Terraform Cloud / HCP Terraform
- Terraform CLI and Terraform language
- Terraform AWS, Kubernetes, and TFE providers
- terraform-aws-modules EKS, VPC, RDS, and security-group modules
- Amazon EKS and Amazon RDS PostgreSQL
- Kubernetes ConfigMaps, Secrets, Deployments, and Flux Kustomizations
- Weave TF-Controller / Tofu Controller

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux build kustomization` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_build_kustomization/
- Tofu Controller Terraform API reference: https://flux-iac.github.io/tofu-controller/References/terraform/
- Tofu Controller custom backend documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/
- HashiCorp Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html
- HashiCorp TFE provider `tfe_workspace` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace.html
- HCP Terraform run triggers documentation: https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-run-triggers
- Terraform AWS EKS module outputs: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/20.24.0
- Terraform AWS VPC module outputs and inputs: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
- Terraform AWS RDS module v6 documentation: https://registry.terraform.io/modules/terraform-aws-modules/rds/aws/6.0.0
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Terraform release index: https://releases.hashicorp.com/terraform/

## Issues Found
- The EKS example used Kubernetes `1.31`, which is in EKS extended support as of May 14, 2026. Changed the example to `1.34`, which is listed by AWS as a standard support EKS version.
- The VPC example referenced `module.vpc.database_subnet_group_name` for RDS but did not define `database_subnets`, so the VPC module would not have subnets for the database subnet group. Added database subnet CIDRs.
- The RDS secret example referenced `module.rds.db_instance_password`, which is not an output of the RDS module. Added a sensitive `db_password` variable, passed it into the RDS module, disabled managed master password mode for that pattern, and used the variable when creating the Kubernetes Secret.
- The Terraform workspace configuration did not define the newly required `db_password` variable. Added a sensitive `tfe_variable` for it.
- The Flux reconciliation signaling example implied that changing a ConfigMap automatically triggers Flux. Flux documents that referenced ConfigMaps and Secrets need the `reconcile.fluxcd.io/watch: Enabled` label, unless the controller is configured with a broader watch selector. Added the label.
- The "Terraform Cloud Run Triggers" section did not define an HCP Terraform run trigger. Renamed the section and description to match the actual workspace configuration code.
- The workspace pinned Terraform `1.9.0`, which is stale relative to the current Terraform release index. Updated it to `1.15.3`.

## Review Notes
- The examples intentionally remain illustrative and are not a complete production Terraform project; they still require provider authentication, IAM permissions, Flux bootstrap resources, and real repository/organization IDs.
- Passing database passwords into Kubernetes Secrets through Terraform works, but it stores sensitive values in Terraform state and substitutes them into workload manifests. For production, consider External Secrets Operator, Secrets Store CSI Driver, or RDS-managed Secrets Manager credentials with workload identity.
