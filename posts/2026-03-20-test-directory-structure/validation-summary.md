# Validation Summary: How to Structure Test Directories for OpenTofu Modules

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform test files
- HCL
- Terratest
- Go test files
- Infrastructure as Code testing

## Sources Consulted
- OpenTofu CLI test command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu module source documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu standard module structure documentation: https://opentofu.org/docs/language/modules/develop/structure/
- OpenTofu v1.11.6 CLI help output for `tofu test -help` and `tofu init -help`
- Terraform test command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test file documentation: https://developer.hashicorp.com/terraform/language/files/tests
- Terratest quick start documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start

## Issues Found
- The fixture module at `tests/fixtures/minimal/main.tf` used `source = "../../"`, which resolves to the `tests/` directory rather than the module root. Changed it to `source = "../../../"` so the fixture loads the root module under test.
- The example test file at `tests/integration/basic.tftest.hcl` used `source = "./fixtures/minimal"`, which does not match the documented fixture location. Changed it to `source = "./tests/fixtures/minimal"` so the alternate module source resolves from the main configuration directory to the shown fixture.
- The running test examples used `--test-directory`. OpenTofu v1.11.6 accepted the double-dash form in local testing, but official documentation and CLI help document `-test-directory`; changed the examples to the documented flag spelling.
- The file naming table only listed `*.tftest.hcl`. Current OpenTofu documentation also supports OpenTofu-specific `*.tofutest.hcl` files, so the table now lists both HCL test-file extensions.

## Review Notes
- OpenTofu also supports JSON test files, including `*.tftest.json` and `*.tofutest.json`, but the post focuses on HCL examples.
- When test files in a custom test directory use alternate modules, run `tofu init -test-directory=<path>` before `tofu test -test-directory=<path>` so OpenTofu installs those test modules.
