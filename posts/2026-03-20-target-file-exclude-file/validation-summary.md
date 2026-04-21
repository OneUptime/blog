# Validation Summary: How to Use -target-file and -exclude-file in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code
- Resource targeting and exclusion
- Shell commands
- GitHub Actions

## Sources Consulted
- OpenTofu 1.11 plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu resource addressing and targeting-file documentation: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu state list command documentation: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu 1.10 "What's new" documentation: https://opentofu.org/docs/v1.10/intro/whats-new/

## Issues Found
- The introduction did not state the version where `-target-file` and `-exclude-file` became available. Updated it to say these flags are supported in OpenTofu 1.10 and later.
- The file-format note treated comment support as version-dependent. Current OpenTofu targeting-file documentation explicitly supports comments and blank lines, so the sentence was corrected.
- The dynamic generation example said "tag or pattern", but `tofu state list` lists resource addresses and supports address/pattern filtering rather than tag filtering. Updated the comment to "resource type or address pattern".
- The "Combining with Other Flags" section showed `-target-file` and `-exclude-file` in the same command. OpenTofu documentation says positive targeting and negative targeting are mutually exclusive, so the example was replaced with separate target and exclude commands.

## Review Notes
OpenTofu documents resource targeting as an exceptional-use feature and recommends splitting very large configurations into smaller independently applied configurations for routine operations. The post already advises following up with a full plan, but future revisions could make the exceptional-use caveat more explicit.
