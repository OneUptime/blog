# Validation Summary: How to Handle Module Dependencies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform dependency graph and `depends_on`
- Terraform outputs and data sources
- Terraform remote state
- AWS provider resources for VPC security group rules, SSM Parameter Store, IAM, KMS, RDS, S3, CloudFront, ECS, and EC2

## Sources Consulted
- HashiCorp Terraform Dependency Graph documentation: https://developer.hashicorp.com/terraform/internals/graph
- HashiCorp Terraform `depends_on` meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/depends_on
- HashiCorp Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- HashiCorp Terraform AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- HashiCorp Terraform AWS provider `aws_vpc` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- HashiCorp Terraform AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- HashiCorp Terraform AWS provider `aws_iam_role_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS Amazon RDS encryption documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- AWS KMS encryption context documentation: https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html

## Issues Found
- The `depends_on` example said there was no direct reference even though the CDN module referenced `module.s3.bucket_domain_name`. Updated the explanation to describe the more precise case: the referenced output may not depend on every resource in the upstream module, such as a bucket policy.
- The S3/CloudFront example said the bucket policy was created inside the CDN module while using `depends_on = [module.s3]`. Updated the comment so the bucket policy is created inside the S3 module, matching the dependency being declared.
- The description of module-level `depends_on` said it waits for the entire module before starting the dependent module and may slow applies. Updated this to align with Terraform documentation: module-level `depends_on` affects all actions in the dependency module and can make plans more conservative while reducing parallelism.
- The circular dependency example used `aws_security_group_rule`. The AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as the current best practice. Updated both ingress examples to use `aws_vpc_security_group_ingress_rule`, `referenced_security_group_id`, and `ip_protocol`.
- The KMS/RDS ordering example referenced `module.rds.execution_role_arn` as a KMS key policy principal, which is not a generally valid RDS module output or RDS encryption pattern. Updated the example to grant an application IAM role access to the KMS key after both modules exist using `aws_iam_role_policy`.

## Review Notes
The examples remain illustrative and assume the referenced local modules expose the shown outputs. For HCP Terraform or Terraform Enterprise, HashiCorp recommends `tfe_outputs` over `terraform_remote_state` because it avoids granting access to the full state snapshot.
