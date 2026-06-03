# Validation Summary: How to Create Redshift Clusters with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Redshift
- Amazon Redshift Serverless
- Terraform
- HashiCorp AWS provider
- AWS IAM
- Amazon VPC security groups
- AWS KMS
- Amazon S3
- Amazon CloudWatch

## Sources Consulted
- Terraform AWS provider `aws_redshift_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_cluster
- Terraform AWS provider `aws_redshift_logging`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_logging
- Terraform AWS provider `aws_redshift_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_parameter_group
- Terraform AWS provider `aws_redshift_snapshot_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_snapshot_schedule
- Terraform AWS provider `aws_redshift_snapshot_schedule_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_snapshot_schedule_association
- Terraform AWS provider `aws_redshiftserverless_namespace`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshiftserverless_namespace
- Terraform AWS provider `aws_redshiftserverless_workgroup`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshiftserverless_workgroup
- Terraform AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Amazon Redshift parameter groups: https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
- Amazon Redshift workload management: https://docs.aws.amazon.com/redshift/latest/mgmt/workload-mgmt-config.html
- Amazon Redshift enhanced VPC routing: https://docs.aws.amazon.com/redshift/latest/mgmt/enhanced-vpc-routing.html
- Amazon Redshift audit logging: https://docs.aws.amazon.com/redshift/latest/mgmt/db-auditing.html
- AWS managed policy `AmazonRedshiftAllCommandsFullAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonRedshiftAllCommandsFullAccess.html
- Referenced OneUptime monitoring guide: https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view

## Issues Found
- The cluster example used a `logging` block inside `aws_redshift_cluster`. Current Terraform AWS provider documentation manages Redshift audit logging with the separate `aws_redshift_logging` resource, so the example was updated accordingly.
- The WLM example assigned `query_group = ["default"]` to the final queue. Amazon Redshift treats the last WLM queue as the default queue, and the default queue should not be routed by a custom query group, so it was changed to an empty query group.
- The WLM example used `max_execution_time` as a timeout setting. Amazon Redshift documents WLM timeout as deprecated, so the deprecated setting was removed from the example.
- The snippets referenced `var.app_security_group_id`, `var.redshift_log_bucket_name`, `var.sns_topic_arn`, and `aws_s3_bucket.redshift_logs` without defining them. The missing variables and log bucket resource were added.

## Review Notes
- The security group example uses inline ingress and egress blocks. This is still supported by the Terraform AWS provider, but the provider documentation recommends separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the current best practice.
- The Redshift audit log bucket may need an explicit bucket policy in stricter cross-account or restricted-bucket setups because Amazon Redshift requires `s3:GetBucketAcl` and `s3:PutObject` access for S3 audit logging.
- The referenced OneUptime monitoring guide URL resolves to a live post.
