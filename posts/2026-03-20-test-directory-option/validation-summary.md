# Validation Summary: How to Use the Test Directory Option in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- `tofu test`
- OpenTofu test files (`*.tftest.hcl`)
- Infrastructure as Code testing
- CI/CD command usage

## Sources Consulted
- OpenTofu official documentation for `tofu test`: https://opentofu.org/docs/cli/commands/test/

## Issues Found
1. **Incorrect flag spelling and short-form description**: The post used `--test-directory` and described `-test-directory` as a short form. OpenTofu's official documentation lists the option as `-test-directory=path`, with no separate short form. Updated the introduction, examples, CI snippet, and conclusion to use `-test-directory`, and removed the incorrect short-form wording.
2. **Incomplete filter example for a custom test directory**: The filtering example targeted `unit-tests/validation.tftest.hcl` without setting `-test-directory=unit-tests`. OpenTofu documents that when `-filter` is used with `-test-directory`, filtered files inside the test directory must be prefixed with that directory path. Updated the example to `tofu test -test-directory=unit-tests -filter=unit-tests/validation.tftest.hcl`.

## Review Notes
- The example test file uses valid OpenTofu test syntax: a file-level `variables` block, a `run` block, `command = plan`, and an `assert` block with `condition` and `error_message`.
- OpenTofu also supports `*.tftest.json`, `*.tofutest.hcl`, and `*.tofutest.json` test files. The post focuses on `*.tftest.hcl`, which is valid for the examples shown.
- The local `tofu` binary was not installed in the review environment, so CLI validation was performed against the official OpenTofu documentation.
