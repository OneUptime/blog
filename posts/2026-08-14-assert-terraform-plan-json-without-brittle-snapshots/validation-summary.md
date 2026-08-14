# Validation Summary: Assert Terraform Plan JSON Without Brittle Snapshots

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Terraform CLI and saved execution plans
- Terraform plan JSON
- Bash
- jq
- Terraform test mocking
- Open Policy Agent (OPA) and Sentinel
- CI/CD infrastructure testing and policy as code

## Sources Consulted

- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform show command](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform machine-readable UI](https://developer.hashicorp.com/terraform/internals/machine-readable-ui)
- [Terraform sensitive data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform test mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform removed block](https://developer.hashicorp.com/terraform/language/block/removed)
- [Terraform provider private state](https://developer.hashicorp.com/terraform/plugin/framework/resources/private-state)
- [Terraform v1.15.8 JSON plan implementation](https://raw.githubusercontent.com/hashicorp/terraform/v1.15.8/internal/command/jsonplan/plan.go)
- [Sentinel policy testing](https://developer.hashicorp.com/sentinel/docs/writing/testing)
- [Open Policy Agent Terraform integration](https://www.openpolicyagent.org/docs/terraform)
- [jq 1.6 manual](https://jqlang.org/manual/v1.6/)

## Issues Found

- The initial `format_version` check only verified that the field was a string, so unsupported major versions would pass. Changed it to accept the supported `1.x` format and reject malformed or unsupported versions.
- The saved-plan caveat described `-refresh=false` as a general limitation. Corrected it to match the CLI documentation: `terraform show -json` requires a plan created without `-refresh=false`.
- The post stated that `planned_values` always omits unknown leaves. Corrected the explanation because unknowns may be omitted or represented as `null`, and added the relevant `after_unknown` and `proposed_unknown` metadata distinction.
- The action discussion and no-replacement predicate omitted Terraform's `forget` action and `["create", "forget"]` replacement form. Added the current action forms and updated the predicate to reject create/delete replacements in either order as well as create/forget replacements.
- The jq examples iterated `.resource_changes[]` directly, which errors when a valid plan omits the optional `resource_changes` property. Updated every generator to iterate over `(.resource_changes // [])[]`, giving empty plans the intended behavior.
- The general format-compatibility advice omitted Terraform's explicit warning that the `checks` JSON representation is experimental and can change in minor CLI releases. Added that exception.
- The normalization guidance referred to provider-private data, but Terraform does not expose provider private state in plans. Replaced that term with unrelated provider-specific metadata.

## Review Notes

- Terraform's native provider mocking is available in Terraform v1.7 and later and only through `terraform test`. Mocked computed values remain unknown during planning by default; a plan-only test that needs generated or overridden values during the plan phase should use `override_during = plan`.
- The OPA Terraform page's walkthrough still uses an older Terraform example, but its plan-policy limitation for unknown values is current and directly supports the post.
- The jq filters were exercised with jq 1.6 using representative create, delete, replacement, unknown-value, and empty-plan inputs. The Terraform CLI flags and saved-plan JSON flow were also checked with an isolated local plan.
- All external links in the post resolved to their intended documentation or author profile.
