# Validation Summary: How to Run Specific Test Files with -filter in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu test files (`.tftest.hcl`, `.tofutest.hcl`, JSON test files)
- Bash
- Git
- GitHub Actions

## Sources Consulted
- OpenTofu CLI docs for `tofu test` (current): https://opentofu.org/docs/cli/commands/test/
- OpenTofu CLI docs for `tofu test` (v1.7.x): https://opentofu.org/docs/v1.7/cli/commands/test/
- OpenTofu source docs for `tofu test`: https://github.com/opentofu/opentofu/blob/main/website/docs/cli/commands/test/index.mdx
- OpenTofu `test` command implementation: https://github.com/opentofu/opentofu/blob/main/internal/command/test.go
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu

## Issues Found
- The post incorrectly stated that `-filter` can target an individual `run` block via `file::run_block_name`. OpenTofu’s documented and implemented behavior is file-level filtering only, so that section was corrected to explain the limitation and show the valid workaround of isolating a scenario in its own test file.
- The post incorrectly said the `-filter` path is relative to the current working directory or `-test-directory` if set. OpenTofu resolves `-filter` paths relative to the current working directory even when `-test-directory` is set, so that explanation was corrected.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, while the current action README documents `@v2` usage. The workflow snippet was updated to use the current major version.
- The “list all test files” example omitted JSON test files even though current OpenTofu also discovers `*.tftest.json` and `*.tofutest.json`. The command was updated accordingly, and the `grep` example was clarified to apply only to HCL-based test files.

## Review Notes
- The GitHub Actions example pins `tofu_version: "1.7.0"`. OpenTofu 1.7.x documentation is no longer actively maintained, but the file-level `-filter` behavior verified for this review is still consistent with current OpenTofu documentation.
