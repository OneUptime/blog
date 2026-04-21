# Validation Summary: How to Use Taint and Untaint in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state management
- OpenTofu resource addressing
- OpenTofu taint/untaint workflow
- OpenTofu `-replace` planning option

## Sources Consulted
- OpenTofu CLI `taint` command documentation - https://opentofu.org/docs/cli/commands/taint/
- OpenTofu CLI `untaint` command documentation - https://opentofu.org/docs/cli/commands/untaint/
- OpenTofu forcing re-creation of resources documentation - https://opentofu.org/docs/cli/state/taint/
- OpenTofu CLI `plan` command documentation - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` command documentation - https://opentofu.org/docs/cli/commands/apply/
- OpenTofu CLI `show` command documentation - https://opentofu.org/docs/cli/commands/show/
- OpenTofu CLI `state list`, `state show`, and `state pull` documentation - https://opentofu.org/docs/cli/commands/state/list/, https://opentofu.org/docs/cli/commands/state/show/, https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu resource addressing documentation - https://opentofu.org/docs/cli/state/resource-addressing/

## Issues Found
- **Taint behavior wording**: The post described taint as causing recreation on the next apply. OpenTofu documents that taint marks the instance in state and the next plan proposes replacement. Updated wording to mention the next plan/apply.
- **`-replace` wording**: The post described `-replace` as "atomic." OpenTofu documentation frames the benefit as keeping the replacement request in the plan/apply workflow and avoiding an interim tainted state snapshot. Updated the wording accordingly.
- **Separated plan/apply workflow**: The post implied separate plan/apply workflows are a reason to prefer taint. OpenTofu supports `tofu plan -replace=... -out=...` followed by `tofu apply <planfile>`, so the text now identifies taint mainly as legacy or for intentionally marking state before a later plan.
- **Plan inspection command**: Replaced the legacy `tofu show tainted-plan.tfplan` form with the current explicit `tofu show -plan=tainted-plan.tfplan` form from OpenTofu's `show` documentation.
- **Tainted resource inspection**: Clarified that `tofu state show` is human-readable and scripting should parse state JSON instead of scraping human-readable output.
- **State locking wording**: Changed "state locking prevents conflicts" to "helps prevent concurrent state writes while the command runs" to avoid overstating what locking guarantees.
- **State JSON example**: Updated the Python example to include module paths and instance keys when printing tainted resource addresses.

## Review Notes
- OpenTofu documents `tofu taint` as deprecated and recommends `-replace` with `tofu apply` for most manual replacement workflows.
- `tofu untaint` remains current for removing tainted status when a resource instance is known to be functioning correctly.
- The local environment did not have the `tofu` binary installed, so command behavior was verified against official OpenTofu documentation rather than local `--help` output.
