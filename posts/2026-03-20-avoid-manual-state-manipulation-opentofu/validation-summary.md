# Validation Summary: How to Avoid Manual State Manipulation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state management
- OpenTofu backend migration
- AWS CLI for S3 state recovery
- Amazon S3 object versioning

## Sources Consulted
- OpenTofu state overview: https://opentofu.org/docs/v1.9/language/state/
- OpenTofu `state mv`: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu refactoring with `moved` blocks: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `state rm`: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu `taint`: https://opentofu.org/docs/cli/commands/taint/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `state pull`: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu `state push`: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu `state list`: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu backend configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu upgrade guides: https://opentofu.org/docs/language/upgrade-guides/
- AWS CLI `list-object-versions`: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `get-object`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html

## Issues Found
- The post said the state file contains "checksums and version metadata". I changed this to lineage, serial, and version metadata because the official `state push` safety checks are based on lineage and serial, and the checksum claim was not supported by the OpenTofu docs.
- The `state mv` section presented `tofu state mv` as the default refactoring approach. I corrected it to note that `moved` blocks are preferred for most refactors, with `tofu state mv` reserved for explicit state moves, matching the OpenTofu refactoring and `state mv` documentation.
- The replacement section claimed `tofu plan -replace` was the better approach in "OpenTofu 1.2+". I removed that impossible version reference because OpenTofu's first stable release was v1.6, and kept the guidance aligned with the current docs showing `-replace` as the preferred replacement workflow and `tofu taint` as deprecated.
- The pull/push section implied manual `state push` was the normal way to migrate between backends. I corrected it to recommend `tofu init -migrate-state` for standard backend migration and kept `state pull`/`state push` positioned as inspection, backup, or rare manual recovery tools, which matches the backend and `state push` documentation.
- The summary paragraph repeated the backend migration issue and omitted the preferred `moved` block guidance. I updated the summary so it is consistent with the corrected body content.

## Review Notes
- `tofu taint` is still available, but the official OpenTofu docs mark it as deprecated and recommend `-replace` with `tofu apply`.
- `tofu state push` is valid, but the official docs say it should rarely be used because it can overwrite backend state if safety checks are bypassed.
- The AWS recovery example is technically valid for S3-backed state when versioning is enabled. It remains backend-specific, so the post's closing note about using S3 versioning or an equivalent backend feature is appropriate.
