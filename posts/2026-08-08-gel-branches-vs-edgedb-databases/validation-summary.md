# Validation Summary: Gel Branches vs Legacy EdgeDB Databases

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Gel 6 and later
- EdgeDB 5 and earlier EdgeDB releases
- Gel branches and legacy EdgeDB databases
- EdgeQL branch DDL
- Gel CLI branch, migration, and query commands
- Gel connection parameters, DSNs, and environment variables
- CI and development database workflows
- PostgreSQL-backed Gel instances

## Sources Consulted
- Gel branches reference: https://docs.geldata.com/reference/datamodel/branches
- Gel branch CLI overview: https://docs.geldata.com/reference/using/cli/gel_branch
- `gel branch create`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_create
- `gel branch switch`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_switch
- `gel branch merge`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_merge
- `gel branch rebase`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_rebase
- `gel branch drop`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_drop
- `gel branch list`: https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_list
- Gel branch development workflow: https://docs.geldata.com/learn/branches
- Gel connection parameters: https://docs.geldata.com/reference/using/connection
- Gel CLI connection flags: https://docs.geldata.com/reference/using/cli/gel_connopts
- `gel instance create` defaults: https://docs.geldata.com/reference/using/cli/gel_instance/gel_instance_create
- Gel system standard library, including `sys::get_current_branch()`: https://docs.geldata.com/reference/stdlib/sys
- Gel extensions: https://docs.geldata.com/reference/datamodel/extensions
- Gel roles and permissions: https://docs.geldata.com/reference/running/admin/roles and https://docs.geldata.com/reference/datamodel/permissions
- Gel server configuration: https://docs.geldata.com/reference/running/configuration
- Gel backend high availability: https://docs.geldata.com/reference/running/backend_ha
- EdgeDB 5 changelog: https://docs.geldata.com/resources/changelog/5_x
- Gel 6 changelog: https://docs.geldata.com/resources/changelog/6_x

## Issues Found
1. The defaults table did not state that `main` and `admin` are defaults for newly created instances. Upgraded or explicitly configured instances can retain different names. Clarified the table introduction without changing its accurate version boundaries.
2. The feature-development example used bare `gel branch create`, which copies whichever branch is active in the linked credentials. Added `--from main` so the command always follows the described workflow and creates the feature branch from Gel's `main` branch.
3. The isolation guidance implied that a separate Gel instance necessarily provides a strict resource, security, failover, or recovery boundary. Gel supports multiple instances on one PostgreSQL backend cluster through distinct tenant IDs, so the instances can still share infrastructure. Clarified that the backend cluster or deployment account must also be separated where the required boundary demands it.

## Review Notes
- Empty, schema, and data branch creation semantics and all shown CLI/DDL syntax match the current official documentation.
- `gel branch merge` is a fast-forward migration merge and preserves the current branch's data. `gel branch rebase` preserves the target branch's data. Neither operation merges independently changed application data.
- `--branch`, `GEL_BRANCH`, and the DSN path are valid ways to select a branch explicitly. Avoiding shared `gel branch switch` state in parallel jobs is sound guidance.
- Roles and Gel 7 permissions are instance-wide. Gel 7 can additionally restrict a role to named branches with `Role.branches`; this does not make branches independent resource or failure boundaries.
- Standalone extension-package installation is instance-level, while enabling an installed extension is branch-specific.
- A plain branch drop fails while connections remain. The CLI also offers `--force` to close those connections before dropping; the post's terminate-then-drop sequence remains the safer explicit example.
- All external documentation links in the post resolved to the intended official Gel pages.
