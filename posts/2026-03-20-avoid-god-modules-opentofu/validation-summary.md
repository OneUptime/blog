# Validation Summary: How to Avoid God Modules in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu modules and module composition
- OpenTofu refactoring with `moved` blocks
- OpenTofu CLI (`tofu init`, `tofu validate`, `tofu test`)
- HCL configuration examples

## Sources Consulted
- OpenTofu Modules: https://opentofu.org/docs/language/modules/
- OpenTofu Creating Modules: https://opentofu.org/docs/language/modules/develop/
- OpenTofu Module Composition: https://opentofu.org/docs/language/modules/develop/composition/
- OpenTofu Refactoring: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `validate` command: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `test` command: https://opentofu.org/docs/cli/commands/test/

## Issues Found
- The post described `tofu validate` and `tofu plan` as "unit testing." I changed that wording to "validate and test in isolation" and replaced the example test flow with `tofu test`, which is OpenTofu's dedicated testing command for module tests.
- The validation examples used plain `tofu init`. I updated them to `tofu init -backend=false`, which OpenTofu documents as the correct initialization pattern for validation without contacting a configured backend.
- The refactoring guidance omitted the need to preserve state addresses when splitting an existing live module. I added a note to use `moved` blocks so readers do not interpret the refactor as a simple file split that would otherwise plan replacements.

## Review Notes
- The module size thresholds in the post are heuristics, not limits enforced by OpenTofu.
- `tofu test` can create real infrastructure unless the test suite uses mocks or overrides.
- The `tofu` CLI was not installed in this workspace, so command verification relied on official OpenTofu documentation rather than local `--help` output.
