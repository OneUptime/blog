# Validation Summary: How to Hide Internal Authentication When Using OAuth in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0 / SSO
- Portainer HTTP API
- `curl`
- `python3`

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer authentication FAQ on internal vs external auth: https://docs.portainer.io/sts/faqs/installing/can-i-use-internal-authentication-and-external-authentication-at-the-same-time
- Portainer troubleshooting FAQ for switching back to internal auth: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-can-i-switch-back-to-internal-authentication
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI schema 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source for settings update behavior: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/settings/settings_update.go
- Portainer source for internal auth fallback restrictions: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/auth/authenticate.go
- Portainer source for BE feature gating of hide-internal-auth: https://github.com/portainer/portainer/blob/2.39.1/app/react/portainer/feature-flags/feature-flags.service.ts

## Issues Found
- The post said to keep "at least one local admin account" as fallback. Portainer documents that when external auth is enabled, only the initial admin user can still log in with internal auth. I changed the prerequisite and fallback verification example to refer to the initial administrator account.
- The emergency access URL was incorrect. The post used `#!/auth`, but Portainer documents `#!/internal-auth` as the internal-auth fallback route. I corrected the URL and removed the unsupported `?auth=local` bypass claim.
- The API examples used partial or reconstructed `OAuthSettings` payloads. Portainer's settings update handler replaces the OAuth settings object when `OAuthSettings` is supplied, so those examples could silently clear existing OAuth fields. I changed both API snippets to fetch the current settings first and then update only `HideInternalAuth` while preserving the rest of the existing OAuth configuration.
- The wording "Users are automatically redirected to the IdP if clicking the SSO button" was imprecise. I adjusted it to "Users are redirected to the IdP when they click the SSO button."

## Review Notes
- Validated against Portainer documentation current as of 2026-04-30 and the Portainer 2.39.1 BE OpenAPI/schema behavior.
- The hide-internal-auth feature is BE-gated in Portainer's official source, so keeping the Business Edition prerequisite is correct.
- No live Portainer instance was used during review; command correctness and behavior were validated against official documentation, the published BE OpenAPI schema, and tagged Portainer source.
