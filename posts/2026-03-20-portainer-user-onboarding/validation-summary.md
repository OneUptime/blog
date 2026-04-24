# Validation Summary: How to Automate Portainer User Onboarding - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Python 3
- Bash
- LDAP authentication and team mapping
- SMTP email delivery

## Sources Consulted
- Portainer API documentation — https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 OpenAPI specification — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Accessing the Portainer API — https://docs.portainer.io/2.21/api/access
- Portainer roles and built-in RBAC roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer LDAP authentication — https://docs.portainer.io/sts/admin/settings/authentication/ldap
- LDAP groups not auto-populating Portainer teams — https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer user-related administration — https://docs.portainer.io/admin/user

## Issues Found
1. The team membership API path in the Python example was incorrect. The post used `POST /api/teams/{team_id}/memberships`, but the current BE API uses `POST /api/team_memberships` for creation and `/api/teams/{id}/memberships` only for listing. Updated the script to use the correct create endpoint.

2. The environment access example used an incorrect fixed access-level mapping (`1=ReadOnly, 2=Standard, 3=Advanced`). In current Portainer BE RBAC, environment access policies store a `RoleId`, and the available roles come from `/api/roles` (for example `Helpdesk`, `Operator`, `Environment administrator`). Updated the script to resolve a role ID by name and use that value in `UserAccessPolicies`.

3. The bulk onboarding example could not work as written because `onboard_user.py` ignored command-line arguments and always ran the hard-coded sample call. Added CLI argument parsing so `bulk-onboard.sh` now passes usernames, email addresses, teams, and semicolon-separated environment IDs successfully.

4. The LDAP settings example was incomplete and partly incorrect. It claimed to cover LDAP/AD while using the LDAP settings payload, omitted the authentication method and basic LDAP connection/search settings, and set `GroupAttribute` to `cn` instead of the membership attribute. Updated the section to an LDAP-specific example with `AuthenticationMethod: 2`, required LDAP settings, and `GroupAttribute: "member"` in line with Portainer's documented LDAP model.

5. The prerequisites understated what is needed to run the Python script. Updated them to call out an admin access token and the `requests` dependency explicitly.

## Review Notes
- Verified against the current Portainer Business Edition 2.39.1 OpenAPI schema and current Portainer docs available on April 24, 2026.
- The post now aligns with BE-only RBAC behavior; the `/api/roles` usage and LDAP team-mapping behavior are not appropriate for Portainer CE.
- The SMTP welcome-email flow is technically valid, but sending initial passwords by email is operationally risky. A password-reset or invite flow would be safer in production.
