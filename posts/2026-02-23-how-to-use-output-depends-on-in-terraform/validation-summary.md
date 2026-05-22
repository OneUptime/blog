# Validation Summary: How to Use Output depends_on in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform output blocks
- Terraform `depends_on` meta-argument
- Terraform modules
- AWS Terraform provider resources for VPC networking, IAM, security groups, RDS, and EKS

## Sources Consulted
- Terraform `depends_on` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform outputs guide: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp AWS provider `aws_iam_role_policy_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- HashiCorp AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider EKS resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon

## Issues Found
- The opening VPC example referenced `aws_internet_gateway.main` without declaring it. Added the missing `aws_internet_gateway` resource so the example's route resource has a valid dependency target.
- The IAM scenario overstated `depends_on` as a fix for IAM policy propagation. Updated it to describe policy attachment ordering and noted that AWS IAM eventual consistency can still exist after Terraform completes the attachment resources.
- The security group rule example used the older generic `aws_security_group_rule` resource. Updated it to use the current AWS provider best-practice resources, `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`.
- The database scenario incorrectly implied that output `depends_on` was useful for parameter group and option group setup even though a correctly configured `aws_db_instance` would already reference those groups. Reframed the example around a separate bootstrap resource that is not referenced by the endpoint output.
- The EKS scenario implied that node groups and add-ons are required before the API endpoint is ready for `kubectl` operations. Updated the wording to describe workload readiness instead.
- The full networking module created NAT gateways based on `length(var.public_cidrs)` but indexed them from private route resources counted by `length(var.private_cidrs)`, which could fail with an invalid index when there are more private subnets than public subnets. Updated NAT EIP and NAT gateway counts to track private subnets and distribute NAT gateways across public subnets with modulo indexing.
- The wrap-up still referred to IAM policy propagation after the IAM section was corrected. Updated it to say IAM policy attachments.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The examples were reviewed against official Terraform language documentation and HashiCorp AWS provider documentation instead.
