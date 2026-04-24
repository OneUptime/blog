# Validation Summary: How to Query Existing Infrastructure with Data Sources in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform-compatible workflows
- AWS VPC, EC2, Route 53, Secrets Manager, IAM, RDS, and EKS
- Kubernetes provider
- HCL

## Sources Consulted
- OpenTofu data source language documentation: https://opentofu.org/docs/language/data-sources/
- AWS provider `aws_vpc` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- AWS provider `aws_subnet` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/subnet.html.markdown
- AWS provider `aws_security_group` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/security_group.html.markdown
- AWS provider `aws_ami` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS provider `aws_caller_identity`, `aws_region`, and `aws_partition` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/partition.html.markdown
- AWS provider `aws_route53_zone` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_secretsmanager_secret` and `aws_secretsmanager_secret_version` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- AWS provider `aws_db_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_eks_cluster` and `aws_eks_cluster_auth` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster_auth.html.markdown
- Kubernetes provider docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/templates/index.md.tmpl
- AWS provider configuration docs for aliased providers and `assume_role`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown

## Issues Found
- The introduction implied that existing infrastructure is referenced without being imported into state at all. I changed this to clarify that data sources avoid importing those objects as managed resources into state.
- The "Multiple Data Source Instances" example referenced `data.aws_subnet.app.id` without defining `data.aws_subnet.app`. I added a valid `aws_subnet` data source filtered within the selected VPC.
- The account/region example used `data.aws_region.current.name` and an undeclared IAM role reference. I updated it to use `data.aws_region.current.region` and `var.app_role_name`, which aligns with the current provider schema and removes the undeclared object.
- The Secrets Manager example created an `aws_db_instance` labeled as a replica without replica configuration and omitted required RDS arguments. I converted it into a valid non-replica DB instance example by adding `allocated_storage`, `skip_final_snapshot`, and a non-replica identifier.
- The cross-account example queried a shared-account VPC but then created an unrelated VPC endpoint using an undefined `aws_vpc.local`. I replaced that with a current-account security group example that actually consumes `data.aws_vpc.shared.cidr_block`.
- The conclusion said data sources are evaluated during the plan phase as an absolute rule. I corrected this to match OpenTofu documentation: reads happen during planning when possible, but may be deferred until apply when values are unknown.

## Review Notes
- The Secrets Manager example is now valid, but the retrieved credentials still flow into configuration and can therefore be stored in state. That is consistent with provider behavior and is worth keeping in mind for production guidance.
- The EKS and Kubernetes provider example is valid for existing clusters. The Kubernetes provider documentation still cautions against creating the cluster and managing Kubernetes resources that depend on it in the same apply operation.
