# Validation Summary: How to Create and Manage User Accounts in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- cURL
- Bash
- JSON
- Python 3

## Sources Consulted
- Portainer docs: Users page https://docs.portainer.io/admin/user/users
- Portainer docs: Add a new user https://docs.portainer.io/admin/user/add
- Portainer docs: Roles https://docs.portainer.io/admin/user/roles
- Portainer docs: Reset a user's password https://docs.portainer.io/admin/user/password
- Portainer docs: Account settings https://docs.portainer.io/user/account-settings
- Portainer docs: API documentation landing page https://docs.portainer.io/api/docs
- Portainer API schema (CE 2.39.1) https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer API schema (BE 2.39.1) https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source: `api/http/handler/users/user_create.go` https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_create.go
- Portainer source: `api/http/handler/users/user_update.go` https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update.go
- Portainer source: `api/http/handler/users/user_update_password.go` https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update_password.go
- Portainer source: `app/portainer/views/users/edit/userController.js` https://github.com/portainer/portainer/blob/develop/app/portainer/views/users/edit/userController.js
- Portainer source: `app/portainer/services/api/userService.js` https://github.com/portainer/portainer/blob/develop/app/portainer/services/api/userService.js

## Issues Found
- The UI navigation path was wrong. The post said `Settings → Users`, but current Portainer documentation places user management under `User-related → Users`. Updated the instructions to match the official docs.
- The user-creation form description was inaccurate. The post listed an optional email field and a role dropdown, but current Portainer docs describe username, password, an Administrator toggle, and optional team assignment. Updated the example fields accordingly.
- The roles section conflated account roles with Business Edition RBAC roles by listing `Read-Only (Helpdesk)` as if it were a standard account role. Corrected this to show Administrator and Standard User as account roles and clarified that BE RBAC roles such as Helpdesk are assigned separately.
- The team-assignment explanation overstated what teams do on their own. Teams do not automatically grant environment access until access is assigned. Updated the wording to reflect that teams are then granted access to environments.
- The `Updating a User` API example was incorrect. The original example sent `password` to `PUT /api/users/{id}` without `newPassword`, which the current handler rejects. Replaced it with a valid role-change example that matches current Portainer behavior.
- The admin password reset API example was incorrect. `PUT /api/users/{id}/passwd` requires the current password, so it is not the right endpoint for an admin resetting another user's password. Updated the example to use `PUT /api/users/{id}` with `newPassword`, which matches the current Portainer UI and handler implementation.
- The forced password change guidance referenced the wrong UI path. Updated it to point users to their profile menu and `My account`.
- The best-practices section suggested disabling inactive users, but the reviewed Portainer docs for user management document removal rather than a user-disable workflow. Updated the guidance to recommend removing inactive users.

## Review Notes
- The published Portainer API schema uses field names like `Username`, `Password`, `Role`, and `NewPassword`, while the current Portainer UI code sends lowercase keys such as `username`, `role`, and `newPassword` for several user endpoints. The reviewed handlers accept the current UI payloads, so the corrected examples follow working behavior rather than the schema's casing alone.
- Portainer role terminology differs between account-level roles and Business Edition RBAC roles. Future posts should be explicit about whether they are describing account creation or environment-level authorization.
