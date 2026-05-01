# Validation Summary: How to Enforce Naming Conventions with Policy as Code in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- TFLint
- Open Policy Agent (OPA)
- Rego
- Conftest
- pre-commit

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `show` command: https://opentofu.org/docs/v1.9/cli/commands/show/
- TFLint `terraform_naming_convention` rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_naming_convention.md
- pre-commit-terraform README: https://github.com/antonbabenko/pre-commit-terraform/blob/v1.83.6/README.md
- Conftest pre-commit documentation: https://www.conftest.dev/pre_commit/
- Conftest hook manifest: https://github.com/open-policy-agent/conftest/blob/v0.68.2/.pre-commit-hooks.yaml
- OPA `contains` keyword: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- OPA `if` keyword: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA regex built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/regex
- OPA object built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/object

## Issues Found
- The TFLint section said the example enforced naming for "all HCL identifiers" while the snippet only configured a subset of block types. I replaced it with the rule's supported top-level `format = "snake_case"` setting so the example matches the documented rule behavior.
- The sample TFLint output used `Error:` wording, but the current rule documentation shows naming-convention findings as `Notice` messages. I updated the example output accordingly.
- The OPA section said it validated "actual cloud resource names", but `conftest test` against `tofu show -json` evaluates the plan JSON, not provider-generated final names. I corrected the wording to "planned cloud resource names".
- The Rego example used older rule syntax and would skip missing `tags.Name` values because the lookup would be undefined. I updated it to current Rego v1 style and switched the lookups to `object.get(...)` so missing names are treated as violations.
- The reusable module used `null_resource` only to host a `precondition`, which makes the example depend on the Null provider even though the module is only generating a string. I moved the validation to an output `precondition`, which OpenTofu supports directly, and removed the unused `region` input from the example.
- The pre-commit example passed `test tfplan.json --policy policies/` to the `conftest-verify` hook, but `conftest-verify` runs `conftest verify`, not `conftest test`. I corrected the hook arguments and updated the Conftest revision to a tag that ships a `.pre-commit-hooks.yaml` manifest.
- The `terraform_tflint` pre-commit example used a relative `.tflint.hcl` path, which is brittle when the hook changes directories per module. I updated it to the documented `__GIT_WORKING_DIR__/.tflint.hcl` pattern.
- The conclusion claimed the setup made violations "impossible" to merge into production. That overstates what linting and plan-time policy checks can guarantee, so I replaced it with a technically defensible conclusion.

## Review Notes
- The CI example assumes the planned resource `name` or `tags.Name` is explicitly present in the OpenTofu plan JSON. If a provider generates a name dynamically, plan-time policy cannot validate the final remote name.
- The blog post is now technically aligned with the official documentation reviewed on 2026-05-01.
