# Validation Summary: How to Configure Atlas Access Roles and Permissions

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas (organization and project roles)
- MongoDB Atlas CLI (`atlas` command)
- MongoDB Atlas Admin API v2
- Terraform (mongodbatlas provider)
- MongoDB database user roles and custom database roles

## Sources Consulted
- MongoDB Atlas CLI documentation — https://www.mongodb.com/docs/atlas/cli/current/
- `atlas organizations users list` command reference — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-users-list/
- `atlas organizations invitations invite` command reference — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-invitations-invite/
- `atlas projects invitations create` command reference — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-projects-invitations-create/
- `atlas dbusers create` command reference — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/
- `atlas customDbRoles create` command reference — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-customDbRoles-create/
- MongoDB Atlas Admin API v2 — Custom Database Roles — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Custom-Database-Roles
- Terraform mongodbatlas_database_user resource — https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/database_user

## Issues Found

1. **Incorrect CLI command for adding users to a project** (line 44): The command `atlas projects users add` does not exist in the Atlas CLI. Changed to `atlas projects invitations create`, which is the correct subcommand for inviting a user to a project. Also updated the comment from "Add a user" to "Invite a user" to match the actual operation.

2. **Incorrect `--privilege` flag format for custom DB roles** (lines 82-83): The `--privilege` format was written as `"orders_db.orders:find"` (lowercase action after colon). The correct Atlas CLI format is `ACTION@db.collection` with uppercase action names. Changed to `FIND@orders_db.orders` and `FIND@orders_db.products`.

3. **Incorrect API endpoint path for custom DB roles** (line 100): The endpoint was written as `/api/atlas/v2/groups/${PROJECT_ID}/customDBRoles` but the correct v2 API path includes `/roles` at the end: `/api/atlas/v2/groups/${PROJECT_ID}/customDBRoles/roles`.

## Review Notes
- The `atlas dbusers create --role readAnyDatabase` command is functionally correct, but the idiomatic Atlas CLI pattern passes built-in roles as positional arguments (e.g., `atlas dbusers create readAnyDatabase --username ...`). Left as-is since both forms work.
- The API curl example does not include the recommended `Accept: application/vnd.atlas.2023-01-01+json` header for the v2 API. This is not strictly required but is recommended by MongoDB for API version pinning.
- Organization and project role names (`ORG_MEMBER`, `GROUP_CLUSTER_MANAGER`, etc.) are all correct and current.
- The Terraform resource configuration is correct and follows current provider conventions.
