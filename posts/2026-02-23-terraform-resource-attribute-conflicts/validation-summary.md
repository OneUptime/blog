# Validation Summary: How to Handle Resource Attribute Conflicts in Terraform

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Terraform configuration language
- Terraform CLI
- Terraform provider schema validation
- HashiCorp AWS provider
- AWS EC2 instances and security groups
- AWS EBS volumes
- AWS VPC route tables and routes
- AWS S3 bucket versioning and encryption resources

## Sources Consulted
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- AWS EBS General Purpose SSD volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_route_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Terraform AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform types and values documentation, including `null` behavior: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform custom validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform plugin framework validator migration documentation for `ConflictsWith`, `ExactlyOneOf`, and `AtLeastOneOf`: https://developer.hashicorp.com/terraform/plugin/framework/migrating/attributes-blocks/validators-predefined
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `state` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state
- GNU grep manual for `-A` context option: https://www.gnu.org/software/grep/manual/grep.html

## Issues Found
- The route table example included both the wrong and correct examples in one HCL snippet using duplicate Terraform resource addresses (`aws_route_table.main` and `aws_route.private`). I changed the corrected example's resource names and references so the snippet remains valid HCL while preserving the intended comparison.
- The EBS encryption example referenced `var.kms_key_id` without declaring the variable. I added a minimal nullable `kms_key_id` variable declaration so the snippet is complete.
- The heading "Using Dynamic Blocks to Avoid Conflicts" did not match the example, which uses `null` to omit `kms_key_id` conditionally rather than a dynamic block. I changed the heading to "Using null to Avoid Conflicts."
- The variable validation example said to use `gp3` or `io1` for custom IOPS but omitted `io2`, which the AWS provider also documents as valid for `iops`. I updated the error message to include `io2`.

## Review Notes
Terraform CLI was not installed in the workspace, so validation was performed against official Terraform language documentation, Terraform CLI documentation, AWS provider registry documentation, and AWS EBS documentation rather than by running `terraform validate`. The post remains accurate for current AWS provider documentation, but readers should still pin and check their provider version because some S3 bucket inline arguments and migration warnings have changed across AWS provider major versions.
