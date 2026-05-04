# Validation Summary: How to Create and Manage Users via the Portainer API

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Portainer (CE/BE 2.x) REST API
- User management endpoints (`/api/users`)
- Team and team membership endpoints (`/api/teams`, `/api/team_memberships`)
- Bash scripting with `curl` and `jq`
- JWT bearer token authentication

## Sources Consulted
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer source — user create handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_create.go
- Portainer source — user update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update.go
- Portainer source — team membership create handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_create.go
- Portainer source — JWT bearer token bouncer: https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- Portainer source — User struct (JSON tags): https://github.com/portainer/portainer/blob/develop/api/portainer.go

## Issues Found
1. **PUT /api/users/{id} password field name** — The "Updating a User" example used `Password` to set the new password. Per the Portainer source (`userUpdatePayload` struct in `user_update.go`), the field for setting a new password is `NewPassword`. The `Password` field in this payload is the *current* password, which is required only when a non-admin changes their own password; when an administrator changes another user's password, only `NewPassword` is needed. Fixed the example to use `NewPassword` and added a clarifying comment.

## Review Notes
- Authentication: the post uses `Authorization: Bearer ${API_TOKEN}`, which is valid for JWT tokens issued by `/api/auth`. JWTs expire (default 8 hours), so for long-running automation an API key issued from the Portainer UI and passed via the `X-API-Key` header is a more durable choice. Both are technically correct; the post does not strictly need to mention this, but readers automating against Portainer should be aware.
- User roles `1` (administrator) and `2` (standard user) are correct and match the enums enforced by the API. Other role IDs (e.g., edge-compute / helpdesk in newer editions) are out of scope for this introductory post.
- Team membership roles `1` (Team Leader) and `2` (Team Member) are correct.
- The `userUpdatePayload` struct tags `Username`, `NewPassword`, and `UseCache` as `validate:"required"` for swagger purposes, but the runtime `Validate()` method only enforces formatting (no whitespace in username) and a valid `Role` value, so partial updates such as `{"Role": 1}` (the "Promote a user to administrator" example) work as shown.
- Endpoint paths (`/api/users`, `/api/users/{id}`, `/api/users/{id}/memberships`, `/api/teams`, `/api/team_memberships`) and JSON field names (`Id`, `Username`, `Role`, `UserID`, `TeamID`) all match current Portainer source.
