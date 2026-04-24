# Validation Summary: How to Use Postconditions on Resources in OpenTofu - Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- Amazon EC2
- Amazon RDS
- Amazon EBS
- Amazon S3
- AWS IAM

## Sources Consulted
- OpenTofu Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Arithmetic and Logical Operators: https://opentofu.org/docs/v1.6/language/expressions/operators/
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_db_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_ebs_volume` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ebs_volume.html.markdown
- AWS provider `aws_iam_role` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- AWS provider `aws_s3_bucket_versioning` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown

## Issues Found
- The post incorrectly stated that a failed resource postcondition taints the resource and leads to destroy/recreate behavior on the next plan. Updated the introduction, failure-behavior section, comparison table, and conclusion to match OpenTofu documentation: failed postconditions raise an error, can halt apply after the resource action has already happened, and block downstream dependent work rather than automatically tainting the resource.
- The module outputs section used `postcondition` blocks with `self.value`. Updated it to use `precondition` blocks on outputs, which is what OpenTofu supports for output validation, and replaced `self.value` references with direct output expressions.
- The basic EC2 example checked `self.public_ip != ""`, which would not reliably reject a `null` public IP because OpenTofu equality operators are type-sensitive. Updated the condition to check both `null` and empty string.
- The RDS example omitted the required `allocated_storage` argument, and the EC2 subnet example omitted the required `instance_type` argument. Added the missing required arguments so the examples are valid against the current AWS provider docs.

## Review Notes
- The AWS examples rely on the current AWS provider schema, which is shared by Terraform and commonly used with OpenTofu.
- The `tofu` CLI binary was not installed in the workspace, so the `tofu apply` command usage was verified against official OpenTofu documentation rather than local `--help` output.
