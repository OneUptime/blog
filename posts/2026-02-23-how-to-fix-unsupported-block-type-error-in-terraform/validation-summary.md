# Validation Summary: How to Fix Unsupported Block Type Error in Terraform

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HCL syntax)
- AWS provider for Terraform (aws_instance, aws_s3_bucket, aws_security_group, aws_iam_role, aws_lambda_function, aws_route_table)
- Terraform top-level `terraform` block configuration
- Terraform dynamic blocks

## Sources Consulted
- AWS provider docs for aws_lambda_function: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- AWS provider docs for aws_iam_role: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role.html.markdown
- HashiCorp Terraform language docs for the `terraform` block, dynamic blocks, and resource syntax
- AWS provider v4.x upgrade guide (S3 bucket refactor into separate resources: aws_s3_bucket_versioning, aws_s3_bucket_server_side_encryption_configuration, aws_s3_bucket_lifecycle_configuration)
- AWS provider docs for aws_instance (network_interface, ebs_block_device, root_block_device blocks)
- AWS provider docs for aws_security_group (ingress/egress blocks) and aws_route_table (route block)

## Issues Found

1. **Cause 3 "Other common examples" — Lambda example was contradictory and incorrect.**
   - The post claimed `environment` is an attribute in `aws_lambda_function`, but `environment` is in fact a configuration block. The "WRONG" example would actually work as written, contradicting the section's framing. The follow-up "RIGHT" example then explicitly said "this one is actually correct" — leaving readers with two identical, correct examples and no demonstration of the attribute-vs-block mistake.
   - **Fix**: Replaced the Lambda example with a genuine and very common case of this mistake: `assume_role_policy` on `aws_iam_role`, which is a JSON string attribute (not a block). The corrected example shows the wrong block-syntax form and the right `jsonencode()` form, which is the standard pattern in the AWS provider docs.

## Review Notes

- In Cause 6, the post lists `required_version`, `required_providers`, `backend`, `cloud`, and `experiments` as "valid blocks inside `terraform`." Strictly speaking, `required_version` is an argument (string) and `experiments` is a list argument — only `required_providers`, `backend`, and `cloud` are nested blocks. The grouping reads naturally as "things you can put in the terraform block," so I left it as-is, but a future revision could tighten this wording. `provider_meta` (a rarely used block) is omitted but this is reasonable for an introductory guide.
- Cause 4's "WRONG" example uses a `rule { type = "ingress" ... }` block that mimics the schema of the separate `aws_security_group_rule` resource. It is a plausible illustrative mistake for someone confusing the two resources, so it works as a teaching example.
- All other technical claims verified: AWS v4 S3 bucket refactor into separate resources is accurate; `network_interface`, `ebs_block_device`, `ingress`/`egress`, and `route` block names are correct for the resources cited; dynamic block syntax requirement (`dynamic "label" { ... }` with the quoted label) is correct; `terraform validate` is the right command for syntax checking.
