# Validation Summary: Diagnose Gel Schema and Migration History Drift

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Gel 6 and 7
- Legacy EdgeDB project conventions
- Gel Schema Definition Language (SDL) and Data Definition Language (DDL)
- Gel filesystem and database migration histories
- Content-addressed migration IDs
- Gel CLI migration, project, query, schema introspection, and branch commands
- Gel development-mode migrations and file watching
- Gel branches, dumps, and restores

## Sources Consulted
- Gel migrations model: https://docs.geldata.com/reference/datamodel/migrations
- Gel migration CLI overview: https://docs.geldata.com/reference/using/cli/gel_migration
- `gel migration status`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_status
- `gel migration log`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_log
- `gel migration create`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_create
- `gel migration edit`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_edit
- `gel migration extract`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_extract
- `gel migration apply` and `--dev-mode`: https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_apply
- Gel migration guide: https://docs.geldata.com/resources/guides/migrations/guide
- Gel local development workflow: https://docs.geldata.com/learn/localdev
- `gel watch`: https://docs.geldata.com/reference/using/cli/gel_watch
- Gel projects: https://docs.geldata.com/reference/using/projects
- Gel connection parameters and precedence: https://docs.geldata.com/reference/using/connection
- Gel v5-to-v6 upgrade and naming guidance: https://docs.geldata.com/resources/upgrading
- Gel system functions: https://docs.geldata.com/reference/stdlib/sys
- `gel describe schema`: https://docs.geldata.com/reference/using/cli/gel_describe/gel_describe_schema
- Gel branches and branch creation: https://docs.geldata.com/reference/datamodel/branches and https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_create
- Gel branch merge and rebase behavior: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_merge and https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_rebase
- `gel restore` and the dump/restore protocol: https://docs.geldata.com/reference/using/cli/gel_restore and https://docs.geldata.com/resources/protocol
- Gel v7 changelog: https://docs.geldata.com/resources/changelog/7_x
- Official Gel source for project-file resolution: https://github.com/geldata/gel-rust/blob/master/gel-dsn/src/gel/project.rs
- Official Gel source for connection-variable aliases: https://github.com/geldata/gel-rust/blob/master/gel-dsn/src/gel/env.rs
- Official Gel CLI source for legacy schema-extension handling: https://github.com/geldata/gel-cli/blob/master/src/migrations/create.rs
- Official Gel dump/restore tests covering migration-history restoration: https://github.com/geldata/gel/blob/master/tests/test_dump_v3.py

## Issues Found
1. The naming paragraph said that mixing Gel and legacy EdgeDB names could make tooling discover a different project contract. Current tooling deliberately supports the legacy aliases and handles conflicting generations with precedence, warnings, or errors rather than silently selecting an unrelated contract. Replaced the claim with accurate Gel 6 rebrand and compatibility guidance and advised updating the names together.
2. The divergent-history recovery steps did not explicitly base the isolated reconciliation branch on the selected authoritative migration chain. Clarified the branch base so the new reconciliation migration has the expected filesystem parent.
3. The production recovery paragraph could be read as restoring a current drifted dump and then applying the authoritative chain. A restore also restores the backed-up schema and migration records, so a current drifted dump reproduces the drift. Clarified that this workflow requires a backup at the common revision before applying the authoritative successor chain.
4. The disposable-branch workflow migrated an empty branch through the entire filesystem chain and then instructed the reader to load data and apply the disputed transition. At that point the transition is already applied. Clarified that the empty branch validates the full chain and that data-bearing transition rehearsal requires a separate disposable branch at the transition's parent revision.

## Review Notes
- All commands and flags shown in the post match the current official CLI reference. Command parsing was also checked with Gel CLI 7.10.2; no live server-backed execution was available.
- `sys::get_current_branch()` and branch commands require Gel or EdgeDB 5 or later. The `gel watch --migrate` form and Gel-branded project conventions date from the Gel 6 workflow changes.
- `gel project info` reports project-link metadata, while explicit connection flags and environment variables can override that project. The accompanying `sys::get_current_branch()` query correctly confirms the branch actually reached.
- Migration IDs cover the migration body and parent revision. Editing an ancestor therefore changes descendant parent references and IDs.
- Direct DDL, development-mode migration behavior, migration extraction, migration rewrite constraints, schema introspection, and the documented development-mode finalization order are accurately described.
- Gel 7 role permissions may restrict branch creation or DDL for non-superusers; this is an authorization prerequisite rather than a syntax problem in the examples.
- Every external documentation link in the post returned HTTP 200 and resolved to the intended official Gel page.
