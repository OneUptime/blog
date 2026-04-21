# Validation Summary: How to Test Sensitive Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu test framework (`tofu test`, `.tftest.hcl`)
- HCL input variables, validation rules, and outputs
- OpenTofu mock providers
- GitHub Actions
- AWS provider resources used in examples

## Sources Consulted
- OpenTofu `test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu setup GitHub Action repository: https://github.com/opentofu/setup-opentofu
- AWS provider `aws_secretsmanager_secret_version` schema source: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/secretsmanager/secret_version.go
- OpenTofu v1.11.6 CLI help and local test runs for command/assertion behavior.

## Issues Found
- `tofu test tests/unit.tftest.hcl` was presented as a way to run a single test file. The official CLI uses `-filter` for this; the positional argument does not select only that file. Updated both examples to `tofu test -filter=tests/unit.tftest.hcl`.
- The command and CI snippets ran `tofu test` without first installing providers. Added `tofu init` before `tofu test`, which is required for a fresh working directory.
- The validation test file omitted the required `api_key` variable declared earlier in the post. Added a fake file-level `api_key` value so the password validation test can run.
- The `accepts_long_enough_password` test used `condition = true`, which OpenTofu rejects because assert conditions must reference an object from the configuration. Changed it to check `length(var.db_password) >= 16`.
- The mock provider example tried to set `secret_string` in `mock_resource` defaults for `aws_secretsmanager_secret_version`. That field is a configurable, non-computed resource argument, and OpenTofu does not allow overriding non-computed fields in mock defaults. Removed the invalid `secret_string` default.
- Later snippets omitted the required `api_key` value. Added clearly fake `api_key` values to keep the examples runnable against the variables declared in the post.

## Review Notes
Sensitive values are redacted from normal OpenTofu UI output, but they can still be stored in state unless ephemeral or write-only patterns are used. The post's advice is accurate for testing behavior, but a future revision could mention state handling if it expands beyond test examples.
