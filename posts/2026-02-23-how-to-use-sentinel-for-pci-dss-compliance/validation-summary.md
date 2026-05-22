# Validation Summary: How to Use Sentinel for PCI DSS Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HashiCorp Sentinel
- HCP Terraform / Terraform Enterprise policy enforcement
- Terraform AWS provider resources
- AWS security groups, load balancers, RDS, EBS, ElastiCache, IAM, CloudTrail, and S3 bucket logging
- PCI DSS v4.0 / v4.0.1 compliance controls

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel `append` function documentation: https://developer.hashicorp.com/sentinel/docs/functions/append
- HashiCorp Sentinel `json` import documentation: https://developer.hashicorp.com/sentinel/docs/imports/json
- HashiCorp Sentinel `types` import documentation: https://developer.hashicorp.com/sentinel/docs/imports/types
- HCP Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HCP Terraform Sentinel policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HCP Terraform policy enforcement levels documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- Terraform AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS IAM JSON policy `Statement`, `Action`, and `Resource` documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_statement.html
- AWS CloudTrail log file validation documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-enabling.html
- PCI Security Standards Council PCI DSS page: https://www.pcisecuritystandards.org/standards/pci-dss/

## Issues Found
- The post described PCI DSS v4.0 only. Updated the wording to mention v4.0.1 as well, since v4.0.1 is the current revision while retaining the same twelve requirement-family structure.
- Sentinel code blocks were marked as `python`. Changed the code fences to `sentinel` so syntax highlighting and reader expectations match the language used.
- The network segmentation policy missed `protocol = "-1"` / `protocol = "all"` security group rules, which the AWS provider documents as opening all ports regardless of port range. Added a protocol check.
- The HTTPS listener policy used unparenthesized `else` expressions inside comparisons. Added parentheses to make the Sentinel expression intent unambiguous.
- The IAM policy example used `types.type_of` without importing the `types` standard import. Added `import "types"`.
- The IAM policy example defined sensitive actions but did not use them, and it did not handle a single-object IAM `Statement`. Added handling for single statement maps and enforced wildcard `Resource` checks for the listed sensitive actions.
- The CloudTrail policy only checked log file validation and KMS encryption on updates, and only checked multi-region trails on creates. Changed it to enforce those settings on both creates and updates.

## Review Notes
The examples are technically valid as illustrative Sentinel policies, but production PCI policy sets usually need more scope-aware logic than shown here, such as CDE tagging, exception workflows, IPv6 CIDR checks, inline `aws_security_group` rules, and the newer `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources.
