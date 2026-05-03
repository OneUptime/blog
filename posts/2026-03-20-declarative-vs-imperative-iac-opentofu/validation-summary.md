# Validation Summary: Declarative vs Imperative IaC with OpenTofu Explained

## Status
validated

## Post Type
Conceptual explainer / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform AWS provider (`aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_instance`, `aws_lambda_function`)
- AWS CLI (`aws s3api`, `aws ec2`)
- Bash scripting
- Terraform/OpenTofu provisioners (`remote-exec`)

## Sources Consulted
- AWS CLI EC2 reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/index.html (verified `create-tags` is the actual command; no `add-tags` subcommand exists)
- Terraform AWS provider `aws_s3_bucket_versioning` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_versioning.html.markdown (verified `versioning_configuration { status = "Enabled" }` syntax)
- AWS CLI S3API reference for `head-bucket`, `create-bucket`, `put-bucket-versioning` commands
- OpenTofu CLI documentation for `tofu apply`
- Terraform/OpenTofu provisioner documentation for `remote-exec`

## Issues Found
- **Side-by-side comparison referenced a non-existent AWS CLI subcommand `aws ec2 add-tags`.** The AWS EC2 CLI has only `create-tags` (and `delete-tags`); there is no `add-tags`. Fixed by changing the `else` branch to also use `aws ec2 create-tags`, which is the real command. The if/else still illustrates the imperative pattern of branching logic, but now uses an actual command.

## Review Notes
- The `aws_s3_bucket_versioning` configuration with `versioning_configuration { status = "Enabled" }` is syntactically correct for the current AWS provider (v4+ where bucket-level configurations were split into separate resources).
- The bash imperative example correctly uses `aws s3api head-bucket`, `create-bucket`, and `put-bucket-versioning` with their proper flags.
- The `provisioner "remote-exec"` syntax with `inline = [...]` is correct, and the inline note recommending `user_data` or configuration management over provisioners reflects current best practice from the OpenTofu/Terraform docs.
- The placeholder AMI ID `ami-0abc123` is not a real AMI format (real AMI IDs are `ami-` followed by 8 or 17 hex characters), but this is clearly illustrative and not a technical error.
- The two-column ASCII comparison inside an ```hcl``` fenced block is not actually HCL — it's pseudo-formatted prose. This is a stylistic choice for visual comparison; the syntax highlighter may render it imperfectly, but it does not affect technical correctness.
