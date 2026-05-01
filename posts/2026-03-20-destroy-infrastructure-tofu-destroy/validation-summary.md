# Validation Summary: How to Destroy Infrastructure with tofu destroy - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language (HCL)
- OpenTofu state and dependency graph behavior
- AWS resource examples (`aws_instance`, `aws_security_group`, `aws_vpc`, `aws_rds_instance`)

## Sources Consulted
- OpenTofu docs: `tofu destroy` command - https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu docs: `tofu plan` command - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply` command - https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu docs: Resource addressing - https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu docs: Resource behavior / `prevent_destroy` - https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu docs: Provisioning infrastructure workflow - https://opentofu.org/docs/cli/run/
- OpenTofu docs: Purpose of state - https://opentofu.org/docs/language/state/purpose/

## Issues Found
- The targeted destroy section said `tofu destroy -target=...` would destroy only the named resource "without affecting others." OpenTofu's official targeting docs state that `-target` also includes dependencies of the targeted address, so I changed the wording to avoid overstating isolation.
- The targeted destroy section did not mention that `-target` is intended for exceptional situations rather than routine operations. I added a short note to match the official CLI guidance.
- The summary said `prevent_destroy` makes accidental destruction "impossible." OpenTofu's docs explicitly say the protection applies only while `prevent_destroy` remains present in configuration, so I changed that claim to a narrower, accurate statement.

## Review Notes
Local `tofu` CLI help could not be checked because the `tofu` binary is not installed in this workspace, so validation relied on current official OpenTofu documentation. The remaining command examples, HCL snippets, and dependency-order explanation are technically consistent with the docs reviewed.
