# Validation Summary: How to Write Sentinel Policies for Compliance Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform and HCP Terraform policy enforcement
- Terraform `tfplan/v2` Sentinel import
- Terraform AWS provider resources
- AWS CloudTrail, S3, RDS, EBS, EFS, Redshift, Elastic Load Balancing, and security groups
- CIS AWS Foundations Benchmark, HIPAA, PCI-DSS, and SOC 2 compliance-oriented controls

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel rules documentation: https://developer.hashicorp.com/sentinel/docs/language/rules
- HashiCorp Sentinel collection operations documentation: https://developer.hashicorp.com/sentinel/docs/language/collection-operations
- HashiCorp Sentinel CLI configuration documentation: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- Terraform AWS provider `aws_cloudtrail` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_s3_bucket_logging` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Terraform AWS provider `aws_efs_file_system` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- Terraform AWS provider `aws_redshift_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_cluster
- Terraform AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS Security Hub CIS AWS Foundations Benchmark mapping: https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/
- PCI Security Standards Council PCI DSS overview: https://www.pcisecuritystandards.org/standards/pci-dss/

## Issues Found
- Several code fences were labeled as `python` even though the examples are Sentinel policies. Changed them to `sentinel`.
- Several Sentinel examples used statements such as `if` blocks and assignments directly inside rule or quantifier expression bodies. Moved that logic into helper functions so `rule`, `all`, and `any` bodies remain valid Sentinel expressions.
- The CIS S3 logging example checked only whether any `aws_s3_bucket_logging` resource existed when any S3 bucket was created. Updated it to match the CIS control more closely by checking the S3 bucket configured on each `aws_cloudtrail` resource.
- Some HIPAA and SOC 2 messages implied that the frameworks mandate exact AWS settings such as customer-managed KMS keys, RDS enhanced monitoring, and specific backup retention. Reworded those messages as organization policy requirements aligned to the compliance goals.
- The compliance report snippet did not define a `main` rule. Added a trivial `main = rule { true }` so the snippet is a complete Sentinel policy.

## Review Notes
The snippets were parsed with Sentinel CLI v0.40.0 using `sentinel fmt -write=false` after extraction from the Markdown. These examples are still simplified policy examples; production policy libraries should add tests with representative `tfplan/v2` mocks and account for unknown Terraform plan values, targeted runs, IPv6 CIDR blocks, inline security group rules, and resources already present in state.
