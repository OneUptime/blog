# Validation Summary: How to Manage Organization and Projects in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Organizations, Projects, Clusters)
- Atlas CLI (`atlas` command-line tool)
- MongoDB Atlas Admin API v2
- Terraform with the `mongodb/mongodbatlas` provider
- Homebrew (for CLI installation)

## Sources Consulted
- MongoDB Atlas CLI source code (`mongodb/mongodb-atlas-cli` on GitHub) — verified command names, flags, and aliases for `projects create`, `projects update`, `projects list`, `projects delete`, `organizations list`, `clusters delete`, `projects invitations invite`, and `auth login`
- MongoDB Atlas Admin API v2 documentation — confirmed `POST /api/atlas/v2/groups` endpoint and request body schema for project creation
- Terraform Registry for `mongodb/mongodbatlas` provider — confirmed provider source, authentication attributes (`public_key`, `private_key`), and `mongodbatlas_project` resource schema (`name`, `org_id`)
- Homebrew core formulae — confirmed `mongodb-atlas-cli` is the correct formula name

## Issues Found
1. **`atlas projects update --tag` does not exist**: The `--tag` flag is available on `atlas projects create`, not on `atlas projects update`. The `update` command requires a `--file` flag pointing to a JSON configuration file. **Fix**: Changed the section to show `atlas projects create` with `--tag` flags, and updated the description to clarify that tags are specified at project creation time.

2. **Project roles list implied completeness**: The comment `# Available project roles:` suggested an exhaustive list, but it was missing several valid roles (e.g., GROUP_BACKUP_MANAGER, GROUP_SEARCH_INDEX_EDITOR, GROUP_STREAM_PROCESSING_OWNER, GROUP_OBSERVABILITY_VIEWER, GROUP_DATABASE_ACCESS_ADMIN). **Fix**: Changed the comment to `# Common project roles:` to accurately reflect that this is a subset.

## Review Notes
- The Terraform provider authentication uses `public_key` / `private_key` (Programmatic API Key authentication), which is valid but MongoDB now also supports Service Account authentication via `client_id` / `client_secret`. The blog's approach remains correct and widely used.
- The Admin API curl example correctly uses `--digest` authentication, which is required for Atlas API key authentication.
- All other CLI commands (`atlas auth login`, `atlas organizations list`, `atlas projects list`, `atlas projects create`, `atlas projects invitations invite`, `atlas clusters delete`, `atlas projects delete`) were verified as correct with accurate flag names and syntax.
