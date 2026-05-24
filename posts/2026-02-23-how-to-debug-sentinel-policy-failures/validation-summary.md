# Validation Summary: How to Debug Sentinel Policy Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- HashiCorp Sentinel (policy-as-code language)
- Sentinel CLI (`sentinel test`, `sentinel version`)
- Terraform Cloud / Terraform Enterprise
- `tfplan/v2` import
- HCL configuration (`sentinel.hcl`)
- Terraform CLI (`terraform plan`, `terraform show -json`)
- Homebrew (`hashicorp/tap`)
- Sentinel Playground (play.sentinelproject.io)

## Sources Consulted
- HashiCorp Sentinel docs — Test command: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel docs — Writing/Testing: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Sentinel docs — Lists: https://developer.hashicorp.com/sentinel/docs/language/lists
- HashiCorp Sentinel docs — Language Spec (operators): https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel Install docs: https://developer.hashicorp.com/sentinel/install
- HashiCorp Homebrew Tap (confirms `sentinel` formula): https://github.com/hashicorp/homebrew-tap
- Sentinel Playground: https://play.sentinelproject.io/

## Issues Found
No technical issues found.

Key verifications performed:
- `brew install hashicorp/tap/sentinel` — confirmed: the `sentinel` formula is present in `hashicorp/homebrew-tap`.
- `sentinel test -run <regex> -verbose` — confirmed: the `-run` flag accepts a regex matching policy/testcase names, and `-verbose` is a valid flag.
- Test config HCL structure with `mock "tfplan/v2" { module { source = "..." } }` and `test { rules = { main = ... } }` — confirmed against official docs.
- Mock data files as `.sentinel` modules containing variable assignments (e.g. `resource_changes = { ... }`) — confirmed.
- Sentinel operators: `is`, `contains`, `not in`, `else` — all confirmed in the language spec.
- `append(list, value)` modifies the list in place — confirmed.
- `tfplan/v2` import and `resource_changes`/`change.after` data shape — matches the documented schema.
- `terraform plan -out=...` and `terraform show -json ...` commands — correct.
- Sentinel Playground URL `play.sentinelproject.io` — confirmed live and is HashiCorp's interactive playground.

## Review Notes
- The code blocks use ```python for Sentinel snippets. Sentinel does not have a dedicated GitHub linguist highlighter, so `python` is a reasonable approximation; this is purely a cosmetic choice and does not affect correctness.
- The `else` operator in Sentinel triggers only on `undefined`, not on `null`. The post's null-handling examples correctly account for this by combining `else {}` with an explicit `is null` check; readers should be aware of the subtle distinction when adapting these patterns.
- The mock data example for `tfplan/v2` is intentionally minimal (only `resource_changes`). Real plans produced via `generate-mock-data` from Terraform Cloud also include `planned_values`, `variables`, `output_changes`, etc.; this is acknowledged implicitly in Technique 6.
- HashiCorp's Sentinel install docs list only direct binary downloads; the `hashicorp/tap` Homebrew formula works but is not yet referenced from the official install page, so readers on macOS may encounter both methods.
