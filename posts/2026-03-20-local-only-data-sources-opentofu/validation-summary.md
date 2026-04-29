# Validation Summary: How to Use Local-Only Data Sources in OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu language and built-in filesystem functions
- HashiCorp `local` provider data sources (`local_file`, `local_sensitive_file`)
- HCL
- AWS provider example resources (`aws_key_pair`, `aws_s3_object`, `aws_lambda_function`, `aws_autoscaling_group`, `aws_secretsmanager_secret_version`)

## Sources Consulted
- OpenTofu `file` function docs: https://opentofu.org/docs/language/functions/file/
- OpenTofu `templatefile` function docs: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu `fileset` function docs: https://opentofu.org/docs/language/functions/fileset/
- OpenTofu `filesha256` function docs: https://opentofu.org/docs/language/functions/filesha256/
- OpenTofu `jsondecode` function docs: https://opentofu.org/docs/language/functions/jsondecode/
- OpenTofu named value/path references docs: https://opentofu.org/docs/language/expressions/references/
- HashiCorp local provider source for `local_file`: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/internal/provider/data_source_local_file.go
- HashiCorp local provider source for `local_sensitive_file`: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/internal/provider/data_source_local_sensitive_file.go
- HashiCorp local provider changelog: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/CHANGELOG.md
- HashiCorp AWS provider Lambda docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown

## Issues Found
- The intro and summary treated all examples as "data sources" and implied they always resolve at plan time. I updated the wording to distinguish filesystem functions from local data sources and to reflect that `local_file` and `local_sensitive_file` can participate in dependencies when reading files created during a run.
- The `local_file` attribute list was worded as if it were exhaustive. I changed it to say these are commonly used attributes because the current provider also exposes additional checksum and ID attributes.
- The `local_sensitive_file` description claimed sensitive content is suppressed from logs. I narrowed this to redaction in normal plan and apply output, which matches official sensitive-value behavior more accurately.
- The path section described the values as "absolute paths" and simplified `path.cwd`. I changed this to "filesystem paths" and clarified that `path.cwd` is the original working directory where `tofu` was invoked.

## Review Notes
- No code examples needed structural changes; the `aws_lambda_function` example using `source_code_hash = filesha256(...)` is still valid with the current AWS provider because `source_code_hash` is a user-defined provider-tracked hash.
- Sensitive values are still stored in state and can appear in machine-readable outputs such as plan/show JSON; the revised post no longer overstates what `local_sensitive_file` hides.
- The latest Terraform Registry pages for the `hashicorp/local` provider currently lack rendered docs, so the provider source files and changelog were used as authoritative references.
- The `templatefile()` example uses a `.tpl` suffix, which remains valid, though current OpenTofu docs recommend `.tftpl`.
