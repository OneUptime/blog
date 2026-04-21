# Validation Summary: How to Use the -test-directory Option in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu native testing framework
- HCL test files
- GitHub Actions

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu `file` function documentation: https://opentofu.org/docs/language/functions/file/
- OpenTofu setup GitHub Action repository: https://github.com/opentofu/setup-opentofu

## Issues Found
- The introduction said `tofu test` only searches `.tftest.hcl` and `.tofutest.hcl` files in the current working directory. Updated it to include wildcard test file names, JSON test files, and the default `tests` directory according to the official `tofu test` documentation.
- The basic usage section showed an absolute path for `-test-directory`, but the official documentation says the path should be relative to the current working directory. Replaced it with a workspace-relative CI path.
- The fixtures section implied `.tfvars` files could be referenced directly from test files and that paths are resolved relative to the test file. Updated the example to pass fixture variables with `-var-file` and reference the resulting root module variable in the test assertion.

## Review Notes
The post is now technically aligned with the current OpenTofu documentation. OpenTofu also searches the current working directory when `-test-directory` is set, so teams should avoid duplicate test file base names unless they understand OpenTofu's `.tofutest.*` precedence behavior.
