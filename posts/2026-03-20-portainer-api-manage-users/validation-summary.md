# Validation Summary: How to Create and Manage Users via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer HTTP API
- Portainer user and team management
- Portainer access tokens and JWT authentication
- Bash
- `curl`
- `jq`
- Python
- Python `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer Community Edition API spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source, `user_create.go` (tag `2.39.1`): https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/users/user_create.go
- Portainer source, `user_update.go` (tag `2.39.1`): https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/users/user_update.go
- Portainer source, `user_update_password.go` (tag `2.39.1`): https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/users/user_update_password.go
- Portainer source, `teammembership_create.go` (tag `2.39.1`): https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/teammemberships/teammembership_create.go
- Portainer user-management docs: https://docs.portainer.io/admin/user
- Portainer roles docs: https://docs.portainer.io/sts/admin/user/roles

## Issues Found
- The create-user and auth examples used request-body field names that did not match the official Portainer schema. I updated them to the documented field names such as `Username`, `Password`, `Role`, and `Name`.
- The password update example was incorrect. Sending only `password` to `PUT /api/users/{id}` does not reset a password. I changed the example to send `NewPassword`, which matches the current handler behavior for admin-driven updates.
- The team-membership creation example used the wrong route. `POST /api/teams/{id}/memberships` is not the create endpoint in the current API. I changed it to `POST /api/team_memberships` with `UserID`, `TeamID`, and `Role`.
- Two shell examples used unquoted JSON variables in `echo`, which can break JSON output through word splitting. I changed them to `echo "$USER"` and `echo "$RESPONSE"`.
- The Python “sync” example only created missing users, so it did not actually behave like a sync routine. I updated it to reconcile role changes and delete users no longer present in the external source.
- The conclusion overstated what team membership alone provides. I adjusted the wording so it refers to Portainer’s broader access-control model instead of implying that team membership by itself grants namespace-level access.

## Review Notes
- The post is technically salvageable and now aligns with the current Portainer CE 2.39.1 API schema and handler behavior.
- In Portainer, the user `Role` field on `/api/users` still represents the top-level administrator vs standard-user distinction. In Business Edition, finer-grained RBAC is assigned separately to users or teams on environments and environment groups.
