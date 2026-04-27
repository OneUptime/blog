# Validation Summary: How to Use tofu output to Read Output Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu output` CLI command)
- Terraform (compatible syntax, `terraform_remote_state` data source)
- HCL output blocks (`output`, `value`, `description`, `sensitive`)
- jq (JSON parsing in shell pipelines)
- AWS provider resources (`aws_s3_bucket`, `aws_eks_cluster`, `aws_db_instance`, `aws_instance`) used as illustrative examples
- Bash / shell scripting for CI/CD pipelines

## Sources Consulted
- OpenTofu CLI docs — `tofu output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu Language docs — Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu source docs (raw): https://raw.githubusercontent.com/opentofu/opentofu/main/website/docs/cli/commands/output.mdx
- HashiCorp Terraform docs — `terraform output` command (for cross-reference): https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found

1. **Incorrect placeholder for sensitive value when querying by name.** The post showed `tofu output db_password` returning `(sensitive value)`. Per the OpenTofu docs, the actual placeholder used by the `tofu output` command is `<sensitive>`, and the line is prefixed with the output name (`db_password = <sensitive>`). The string `(sensitive value)` is what `tofu plan` / `tofu apply` show, not what the `tofu output` command shows. Fixed to `db_password = <sensitive>`.

2. **Missing quotes in single-output examples.** The post showed `tofu output bucket_name` returning `acme-data-production` and `tofu output cluster_endpoint` returning `https://...`. In the default human-readable format, OpenTofu prints string values with surrounding double quotes when querying a single non-sensitive output (only the `-raw` flag strips the quotes). Fixed both examples to wrap the values in quotes.

3. **Inaccurate description of the default output format.** The post described the default `tofu output` format as "table". OpenTofu does not render outputs as a table — it prints `name = value` pairs in human-readable form. Fixed the comment to "Display outputs in human-readable form (default)".

## Review Notes
- The `aws_db_instance.main.password` reference used in the sensitive output example is supported by the AWS provider but is generally discouraged in production (passwords end up in state). It is a reasonable illustrative example for the `sensitive = true` feature so left as-is.
- The simplified `-json` example (`{ "value": ..., "sensitive": ... }`) omits the `type` field that OpenTofu actually emits. The example is clearly a representative snippet (uses `"https://..."` ellipsis), so the omission is acceptable for didactic purposes and was left unchanged.
- The output description "Name of the S3 state bucket" applies to a resource named `aws_s3_bucket.data`, which is a slight internal inconsistency but does not affect the technical demonstration of `description`.
- The `terraform_remote_state` data source name is intentionally retained in OpenTofu for backward compatibility — the example is correct as written.
- For sensitive outputs, OpenTofu also supports a `-show-sensitive` flag to reveal the value without using `-raw`/`-json`; this is a possible future addition but not required for correctness.
