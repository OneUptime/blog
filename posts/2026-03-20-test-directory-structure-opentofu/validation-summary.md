# Validation Summary: How to Set Up a Test Directory Structure in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu `tofu test`
- OpenTofu `.tftest.hcl` test files
- HCL `.tfvars` variable files
- GitHub Actions

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- OpenTofu `setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- GitHub `actions/checkout` action README: https://github.com/actions/checkout

## Issues Found
- The GitHub Actions example placed `on` triggers under individual jobs, which is not valid workflow syntax. Moved `on` to the top level and used job-level `if` conditions to keep unit tests on pull requests and integration tests on pushes to `main`.
- The CI example used `opentofu/setup-opentofu@v1`, while the current official action documentation uses `@v2`. Updated both jobs to `opentofu/setup-opentofu@v2`.
- The CI example did not check out the repository before running `tofu init` and `tofu test`. Added `actions/checkout@v6` so the workflow has access to the configuration files.
- The monorepo fixture example described a `.tftest.hcl` file as shared mock provider configuration. OpenTofu test files can contain `mock_provider` blocks, but the docs do not provide an include mechanism for reusable mock-provider fixture files. Changed the example to a shared `.tfvars` fixture and removed the reusable mock-provider wording.
- The unit-test directory description implied that `command = plan` always avoids credentials. Narrowed the wording to plan runs that do not need real provider API calls.

## Review Notes
OpenTofu currently supports `.tftest.hcl`, `.tftest.json`, `.tofutest.hcl`, and `.tofutest.json` test files. The post's `.tftest.hcl` examples remain valid. The local `tofu` binary was not installed, so CLI verification was performed against official OpenTofu documentation.
