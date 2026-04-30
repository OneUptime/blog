# Validation Summary: How to Generate OpenTofu Configuration from Existing AWS Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- AWS CLI
- HCL
- Bash

## Sources Consulted
- OpenTofu import docs: https://opentofu.org/docs/language/import/
- OpenTofu generating configuration docs: https://opentofu.org/docs/language/import/generating-configuration/
- OpenTofu CLI import docs: https://opentofu.org/docs/cli/import/
- OpenTofu import usage docs: https://opentofu.org/docs/cli/import/usage/
- OpenTofu resource behavior docs (`ignore_changes`): https://opentofu.org/docs/v1.11/language/resources/behavior/
- AWS CLI `describe-instances` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/ec2/describe-instances.html
- AWS provider `aws_instance` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_s3_bucket` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_security_group` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_db_instance` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_iam_role` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- AWS provider `aws_route53_zone` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- AWS provider `aws_lb` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS provider `aws_eks_cluster` import docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown

## Issues Found
- The opening explanation implied that `import` blocks themselves generate configuration automatically. I corrected it to state that configuration generation happens through the experimental `tofu plan -generate-config-out` workflow.
- The modern import workflow omitted the prerequisite that the AWS provider must already be configured and initialized. I added that requirement because OpenTofu needs provider configuration to generate or import resources.
- The `Classic Import Command` section did not mention that matching `resource` blocks must already exist before running `tofu import`. I added that requirement to match the OpenTofu CLI docs.
- The `Handling Import Drift` example mixed shell commands and HCL in a single `bash` code block. I split it into separate `bash` and `hcl` snippets so the examples are syntactically correct.

## Review Notes
- Resource import identifiers were validated for `aws_instance`, `aws_s3_bucket`, `aws_security_group`, `aws_db_instance`, `aws_iam_role`, `aws_route53_zone`, `aws_lb`, and `aws_eks_cluster`.
- As of 2026-04-30, OpenTofu 1.11.x still documents configuration generation via `-generate-config-out` as experimental.
- The local workspace did not have the `tofu` or `aws` CLIs installed, so command validation was performed against official documentation rather than local `--help` output.
