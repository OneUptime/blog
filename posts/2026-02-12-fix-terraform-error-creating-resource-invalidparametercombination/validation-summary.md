# Validation Summary: How to Fix Terraform 'Error creating resource: InvalidParameterCombination'

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Terraform
- AWS CLI
- Amazon EC2
- Amazon EBS
- Amazon RDS
- Amazon ElastiCache

## Sources Consulted
- AWS CLI Command Reference: `ec2 describe-images` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI Command Reference: `ec2 describe-instance-type-offerings` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html
- AWS CLI Command Reference: `rds describe-orderable-db-instance-options` - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-orderable-db-instance-options.html
- Amazon EBS User Guide: Amazon EBS volume types - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Amazon RDS User Guide: Amazon RDS DB instance storage - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Terraform AWS Provider documentation: `aws_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider documentation: `aws_db_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider documentation: `aws_ami` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS Provider documentation: `aws_elasticache_replication_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group

## Issues Found
- The post said Terraform cannot catch `InvalidParameterCombination` issues during `plan` and that they only surface during `apply`. This was too absolute because Terraform provider schemas can catch some conflicts, while many AWS-specific compatibility rules are only detected by AWS during apply. Updated the wording to say Terraform often cannot catch AWS-specific compatibility rules during `plan`.
- The EC2/EBS section implied older EC2 instance types do not support `io2` volumes. AWS documents the more precise constraint as performance limits, with maximum `io2` IOPS requiring Nitro-based instances. Updated the section title and explanation to focus on EBS performance limits.
- The RDS gp3 example set `iops = 3000` on `allocated_storage = 100`. For most RDS engines, AWS does not allow provisioned gp3 IOPS below engine-specific storage thresholds; RDS provides baseline performance instead. Removed the `iops` setting from that example and added a concise caveat.

## Review Notes
AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
