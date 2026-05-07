# Validation Summary: How to Assign the Administrator Role in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- RBAC and user management
- `curl`
- Python 3

## Sources Consulted
- Portainer docs: Turn a user into an administrator - https://docs.portainer.io/admin/user/promote
- Portainer docs: Roles - https://docs.portainer.io/admin/user/roles
- Portainer docs: Add a new user - https://docs.portainer.io/admin/user/add
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer CE OpenAPI 2.39.2: `auth.yaml` - https://api-docs.portainer.io/versions/ce/2.39.2/auth.yaml
- Portainer CE OpenAPI 2.39.2: `users.yaml` - https://api-docs.portainer.io/versions/ce/2.39.2/users.yaml
- Portainer source: user update handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_update.go
- Portainer source: user edit UI controller - https://raw.githubusercontent.com/portainer/portainer/develop/app/portainer/views/users/edit/userController.js

## Issues Found
- The UI walkthrough was outdated. Current Portainer documentation shows opening **User-related** > **Users**, selecting the user, toggling **Administrator** on, and clicking **Save**. The post previously described a role dropdown and an **Update user** button, so that section was corrected to match the current documented UI.

## Review Notes
- The API examples remain technically valid against the current Portainer API materials. `POST /api/auth` still returns a JWT, and the user-management endpoints in the current OpenAPI spec continue to use role values `1` for administrator and `2` for regular user.
- Portainer's current API guidance also documents API-key-based access with the `X-API-Key` header, but the JWT-based `Authorization: Bearer ...` flow used in the post is still represented in the official API specification and source.
