# Validation Summary: How to Use Terraform Check Blocks for Infrastructure Assertions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform check blocks and custom conditions
- Terraform preconditions and postconditions
- HashiCorp AWS provider
- HashiCorp DNS provider
- HashiCorp HTTP provider
- AWS S3, ACM, RDS, EC2 security groups, and load balancers

## Sources Consulted
- Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- Terraform validation/custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider `aws_s3_bucket` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket
- Terraform AWS provider source for `aws_s3_bucket` data source schema: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/s3/bucket_data_source.go
- Terraform AWS provider `aws_s3_bucket_versioning` resource documentation/source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation/source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider `aws_acm_certificate` data source documentation/source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- Terraform AWS provider `aws_db_instance` resource/data source documentation/source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_security_group` data source/source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
- Terraform AWS provider `aws_instance` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- Terraform AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform DNS provider `dns_a_record_set` data source documentation: https://registry.terraform.io/providers/hashicorp/dns/latest/docs/data-sources/a_record_set
- Terraform HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http

## Issues Found
- The introductory check example used `data.aws_s3_bucket.example.versioning[0].enabled`, but the current AWS provider `aws_s3_bucket` data source does not expose a `versioning` attribute. Changed the example to assert the supported `bucket_region` attribute.
- The S3 versioning check used the unsupported `aws_s3_bucket` data source `versioning` attribute. Changed it to check `aws_s3_bucket_versioning.production_data.versioning_configuration[0].status == "Enabled"`.
- The S3 encryption check used `data "aws_s3_bucket_server_side_encryption_configuration"`, but the AWS provider exposes this as a resource, not a data source. Changed the assertion to reference `aws_s3_bucket_server_side_encryption_configuration.production.rule`.
- The certificate section claimed to check certificate expiry, but the code only validates that an ACM certificate is in `ISSUED` status. Updated the heading, introductory sentence, comment, and check label to describe certificate status accurately.
- The RDS example referenced `data.aws_db_instance.production.db_instance_status`, but the current AWS provider data source does not expose `db_instance_status`. Changed the example to use the managed resource attribute `aws_db_instance.production.status` and the existing resource attributes for Multi-AZ and encryption checks.
- The security group example referenced `data.aws_security_group.db.ingress`, but the current AWS provider security group data source does not expose ingress rule details. Changed the check to reference `aws_security_group.database.ingress`.
- The precondition/postcondition comparison described them only as resource lifecycle checks. Updated the wording to reflect Terraform documentation that they can be used with resource, data source, and output blocks.

## Review Notes
- The examples assume the referenced resources, such as `aws_s3_bucket_versioning.production_data`, `aws_s3_bucket_server_side_encryption_configuration.production`, `aws_db_instance.production`, and `aws_security_group.database`, are declared elsewhere in the configuration.
- The security group example now validates inline `ingress` rules on `aws_security_group`. The current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` resources for new code, but inline rules remain supported.
