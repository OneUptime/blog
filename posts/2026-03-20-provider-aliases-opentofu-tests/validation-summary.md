# Validation Summary: How to Use Provider Aliases in OpenTofu Tests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu test files (`.tftest.hcl`)
- Provider aliases
- Mock providers
- AWS provider examples (`aws_s3_bucket`, `aws_iam_role`, `aws_iam_role_policy_attachment`)

## Sources Consulted
- OpenTofu `tofu test` command docs: https://opentofu.org/docs/cli/commands/test/
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu providers within modules docs: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu module `providers` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/module-providers/
- HashiCorp AWS provider `aws_s3_bucket` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The child-module section conflated `run.module` with a normal child-module call and claimed OpenTofu would automatically map aliased test providers to child-module requirements. I corrected the text so it matches the docs: when `run.module` loads a module directly, the test should define the alias names that module declares; when a separate harness/root module calls a child module, aliased provider configurations must be passed with the normal `providers` argument.

## Review Notes
- The post is technically correct after the fix above.
- The real-provider AWS example still assumes valid AWS credentials and globally unique S3 bucket names at execution time, which is normal for an illustrative `apply` example.
