# Validation Summary: How to Deploy Authentik via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- authentik
- PostgreSQL
- OAuth2 / OpenID Connect (OIDC)
- LDAP
- GitHub OAuth

## Sources Consulted
- authentik Docker Compose installation: https://docs.goauthentik.io/install-config/install/docker-compose/
- authentik architecture: https://docs.goauthentik.io/core/architecture/
- authentik worker: https://docs.goauthentik.io/worker/
- authentik email configuration: https://docs.goauthentik.io/install-config/email/
- authentik OAuth2 provider creation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider/
- authentik outposts: https://docs.goauthentik.io/add-secure-apps/outposts/
- authentik LDAP provider: https://docs.goauthentik.io/add-secure-apps/providers/ldap
- authentik LDAP provider creation: https://docs.goauthentik.io/add-secure-apps/providers/ldap/create-ldap-provider/
- authentik GitHub social login: https://docs.goauthentik.io/users-sources/sources/social-logins/github/
- authentik sources and adding sources to the default login page: https://docs.goauthentik.io/users-sources/sources/
- authentik release 2026.2: https://docs.goauthentik.io/releases/2026.2
- goauthentik GitHub releases: https://github.com/goauthentik/authentik/releases

## Issues Found
- The post used an outdated 2024.6-era Docker Compose pattern with Redis. Current official authentik Compose deployments use PostgreSQL plus the server and worker containers, without Redis. I removed Redis, updated the image tag to `2026.2.2`, switched persistence to `/data`, and removed the deprecated top-level `version` key.
- The SMTP settings were only defined on the `server` container, but authentik sends email from the worker. I added the same global email settings to the worker and mounted `/templates` there as well.
- The initial setup section incorrectly implied that the setup flow creates a new administrator user. The official flow sets the password for the default `akadmin` account, so I corrected that wording.
- The OAuth2 provider steps used the older standalone provider creation flow. I updated them to the current recommended `Create with provider` workflow and clarified that the generated client credentials should be copied from authentik.
- The LDAP section was incomplete for a working setup. I added the required service account, the `Search full LDAP directory` permission, and the LDAP outpost step.
- The GitHub social-login section omitted two required details: the callback URL must match the source slug, and the source must be added to the default authentication flow to appear on the login page. I added both.
- The conclusion referenced LDAP sync as a worker responsibility in a way that did not match the provider guidance in the post. I replaced it with worker responsibilities documented for current authentik deployments.

## Review Notes
- The compose example is now aligned with the current official authentik release available on April 24, 2026: `2026.2.2`.
- The post still uses Portainer-friendly named volumes instead of the bind mounts shown in authentik's reference Compose file; this is technically valid for a Portainer stack.
- No additional technical issues found after the corrections.
