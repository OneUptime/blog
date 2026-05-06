# Validation Summary: Best Practices for User and Team Management in Portainer

## Status
validated

## Post Type
Guide / Best practices

## Technologies Covered
- Portainer Business Edition
- Portainer RBAC and environment access control
- LDAP authentication
- Active Directory authentication
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer LDAP authentication documentation: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer Active Directory authentication documentation: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer logs documentation: https://docs.portainer.io/admin/logs
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer Business Edition OpenAPI spec used to verify `/auth`, `/users`, and `/users/{id}/tokens`: https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
1. **Role descriptions were inaccurate**: The original table said `Helpdesk` users had console access and said `Standard User` could deploy in "their namespace". Portainer documents `Helpdesk` as read-only with no console access, and `Standard User` as having control over resources they or their team deploy. I updated the role names and descriptions to match the documented RBAC behavior.
2. **The LDAP/AD section described unsupported role mapping behavior**: The original post implied Portainer supports direct directory group mappings to roles like `Standard User` and `Read-Only User`. Portainer documents automatic provisioning, matching directory groups to identically named Portainer teams, and optional auto-assignment of administrator rights for selected groups. I rewrote this section to reflect the documented model.
3. **The LDAP sync claim was too strong**: The original text claimed users are automatically added and removed as they join or leave AD groups. Portainer's docs explicitly describe automatic provisioning and automatic placement into matching Portainer teams when group search is configured, but do not document the stronger add/remove claim as written. I narrowed the statement to the documented behavior.
4. **The logging section used inaccurate terminology**: The post referred to "audit logging" as something to enable, while Portainer documents this feature area as authentication and activity logs in Business Edition. I renamed the section and adjusted the wording to match the official docs.
5. **The API example was incorrect**: The original `POST /api/users` example used the wrong JSON field casing, omitted the JSON content type header, and used `POST /api/auth` as if it generated an API token. Portainer's API uses `Username`, `Password`, and `Role` for user creation, `/auth` for JWT authentication, and `/users/{id}/tokens` to generate an API key for the calling user. I corrected the example accordingly.

## Review Notes
- The post is now technically sound after the fixes above.
- Several capabilities discussed here, including granular RBAC roles, directory authentication, and authentication/activity logs, are Business Edition features.
- The service-account token flow matters operationally: an administrator can create the account, but the token must be generated as that user when using the documented API flow.
