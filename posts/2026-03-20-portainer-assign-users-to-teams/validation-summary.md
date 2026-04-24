# Validation Summary: How to Assign Users to Teams in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Bash
- curl
- Python 3

## Sources Consulted
- Portainer Documentation: Add a user to a team - https://docs.portainer.io/admin/user/teams/add-user
- Portainer Documentation: Add a new team - https://docs.portainer.io/admin/user/teams/add
- Portainer Documentation: Add a new user - https://docs.portainer.io/admin/user/add
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer Documentation: LDAP authentication - https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer Documentation: OAuth authentication - https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer source: Team membership model - https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: Create team membership handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_create.go
- Portainer source: Update team membership handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_update.go
- Portainer source: Delete team membership handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_delete.go
- Portainer source: Team memberships listing handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/teams/team_memberships.go
- Portainer source: Authentication handler and request bouncer - https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: Bearer/API key auth handling - https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- Portainer UI source: Team membership UI actions - https://github.com/portainer/portainer/blob/develop/app/react/portainer/users/teams/ItemView/TeamAssociationSelector/UsersList/name-column.tsx
- Portainer UI source: Team role promotion UI - https://github.com/portainer/portainer/blob/develop/app/react/portainer/users/teams/ItemView/TeamAssociationSelector/TeamMembersList/columns/team-role-column.tsx
- Portainer UI source: User edit view - https://github.com/portainer/portainer/blob/develop/app/portainer/views/users/edit/user.html

## Issues Found
- The post used `/api/teams/{id}/memberships` for create, update, and delete operations. I changed those examples, and the bulk assignment script, to use `/api/team_memberships`. The nested `/api/teams/{id}/memberships` route is for listing a team's memberships.
- The `PUT` example only sent `role` in the request body. I updated it to include `userID`, `teamID`, and `role`, which matches Portainer's team membership update payload.
- The UI steps referred to `Settings → Teams/Users` and described an outdated membership-edit flow from the user details page. I corrected the navigation to `User-related`, updated the team-page add-member steps to match the current UI, and replaced the inaccurate user-details workflow with the supported "during user creation" flow.
- The post omitted the caveat that the team leader role is disabled when external authentication is enabled with team synchronization. I added that note.
- The conclusion said LDAP and OAuth synchronization both come from "directory group membership". I corrected this to `LDAP group membership or OAuth claims`, which matches Portainer's documented behavior.

## Review Notes
- Verified against current Portainer documentation and the current Portainer source/API definitions.
- The post's JWT-based authentication examples remain valid. Portainer also supports API keys via `X-API-KEY`, but that was not required to correct the article.
