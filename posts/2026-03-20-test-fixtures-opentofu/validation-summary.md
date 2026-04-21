# Validation Summary: How to Set Up Test Fixtures for OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu native testing
- OpenTofu CLI
- HCL test files (`.tftest.hcl`)
- AWS provider resources and data sources
- Bash fixture setup scripts
- GitHub Actions CI

## Sources Consulted
- OpenTofu test command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu module source documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu `output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `apply` and `destroy` command documentation: https://opentofu.org/docs/cli/commands/apply/ and https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu v1.11.6 CLI help from the official release: https://github.com/opentofu/opentofu/releases/tag/v1.11.6
- AWS provider VPC, subnet, DB subnet group, security group, and security group ingress rule docs: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r
- AWS provider `aws_vpc`, `aws_subnets`, and `aws_availability_zones` data source docs: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/d
- OpenTofu setup GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- AWS credentials GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The security group example used inline `ingress` rules. Updated it to use `aws_vpc_security_group_ingress_rule`, which the current AWS provider documentation recommends as the best-practice resource for VPC security group rules.
- The test fixture module source path did not match the shown directory layout. Updated `source = "./fixtures/networking"` to `source = "./tests/fixtures/networking"` because OpenTofu resolves test `run.module.source` local paths from the module working directory.
- The shared fixture example declared `data` blocks directly in a `.tftest.hcl` file, which OpenTofu test files do not support. Moved those data sources into a helper module and passed its outputs through a setup `run` block.
- The Bash snippets placed the shebang after a filename comment and did not preserve exported values for later GitHub Actions steps. Moved the shebang to the first line, quoted JSON parsing, and wrote fixture outputs to `$GITHUB_ENV` when running in GitHub Actions.
- The CI example did not install OpenTofu, did not grant OIDC `id-token: write` permission for role assumption, and used an undocumented positional directory argument for `tofu test`. Added `opentofu/setup-opentofu@v2`, job permissions, an explicit `tofu init -test-directory=tests/integration`, and the documented `tofu test -test-directory=tests/integration -verbose` command.

## Review Notes
The examples assume CI commands run from the module root containing `tests/`. In a monorepo, set the workflow `working-directory` or adjust paths accordingly. For parallel CI runs, consider adding unique fixture names or prefixes to avoid AWS name collisions.
