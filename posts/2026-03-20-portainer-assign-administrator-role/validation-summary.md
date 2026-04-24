# Validation Summary: How to Assign the Administrator Role in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Portainer Business Edition activity logs
- Docker CLI
- Bash

## Sources Consulted
- Portainer docs: Users - https://docs.portainer.io/admin/user/users
- Portainer docs: Add a new user - https://docs.portainer.io/2.33-lts/admin/user/add
- Portainer docs: Turn a user into an administrator - https://docs.portainer.io/2.33-lts/admin/user/promote
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer official OpenAPI spec (BE 2.39.1) - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer docs: API usage examples / authentication - https://docs.portainer.io/sts/api/examples
- Portainer docs: Activity logs - https://docs.portainer.io/admin/logs/activity
- Portainer docs: Reset the admin user's password - https://docs.portainer.io/advanced/reset-admin
- Portainer official source: `user_create.go` - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_create.go
- Portainer official source: `user_update.go` - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_update.go
- Portainer official source: `user_create_access_token.go` - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_create_access_token.go

## Issues Found
- The UI navigation path was outdated. The post said `Settings -> Users`, but current Portainer docs use `User-related -> Users`. I updated both UI walkthroughs accordingly.
- The existing-user promotion flow described a `Role` dropdown. Current Portainer docs show an `Administrator` toggle on the user page. I changed the wording to match the documented UI.
- The API create-user examples used lowercase payload fields (`username`, `password`, `role`). The official OpenAPI spec documents `Username`, `Password`, and `Role`. I updated the examples to match the current API schema.
- The activity-log example called `GET /api/audit?role=1`, which is not the current documented API path. I replaced it with the documented user activity log endpoint, `GET /api/useractivity/logs`, using a username filter example for an admin account.
- The lock-out section implied the helper resets any forgotten admin password. Portainer documents the helper as resetting the initial admin account. I corrected the wording and added the documented `docker pull portainer/helper-reset-password` step.
- The admin capability list referred to `audit logs`. Current Portainer docs expose `authentication` and `activity` logs. I updated that bullet to use the documented terminology.

## Review Notes
- The API authentication example using `POST /api/auth` with a bearer JWT is still valid per the current Portainer API examples, although Portainer also documents API access tokens for ongoing API use.
- Creating password-based local users and generating API tokens depends on Portainer's authentication configuration. In particular, token generation for `POST /users/{id}/tokens` must be performed by the user themselves, not by another admin on their behalf.
