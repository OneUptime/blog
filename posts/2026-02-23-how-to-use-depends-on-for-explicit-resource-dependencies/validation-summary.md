# Validation Summary: How to Use depends_on for Explicit Resource Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform `depends_on` meta-argument
- Terraform modules and data sources
- AWS provider resources for IAM, Lambda, VPC/VPN routing, EKS, ECS, and RDS examples
- Kubernetes provider configuration example

## Sources Consulted
- HashiCorp Terraform `depends_on` meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/depends_on
- HashiCorp Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp AWS provider `aws_vpn_gateway_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_attachment
- HashiCorp AWS provider `aws_iam_policy` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy

## Issues Found
- The VPN gateway example set `vpc_id` on `aws_vpn_gateway` and also created a separate `aws_vpn_gateway_attachment`. The AWS provider documentation states that `aws_vpn_gateway` can attach itself with `vpc_id`, while `aws_vpn_gateway_attachment` is for attaching an existing gateway to a VPC. I removed `vpc_id` from `aws_vpn_gateway` and added a tag so the separate attachment resource is the resource that performs the attachment.
- The data source example used `name = aws_iam_policy.app.name`, which already creates an inferred dependency on the managed policy. I changed it to use the same literal policy name as the resource, so `depends_on = [aws_iam_policy.app]` demonstrates the documented case where a data source needs an explicit dependency to defer reading until after the resource operation completes.

## Review Notes
The core explanation matches Terraform's official guidance: use `depends_on` for hidden dependencies, prefer expression references where possible, and avoid broad module-level dependencies unless necessary because Terraform may produce more conservative plans. The EKS/Kubernetes provider example is conceptually valid but in production may also require provider authentication details and readiness handling beyond the shortened snippet.
