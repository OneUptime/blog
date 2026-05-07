# Validation Summary: How to Configure OIDC Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- OpenID Connect (OIDC)
- Keycloak
- Auth0 Actions
- Dex
- Kubernetes RBAC
- JSON Web Tokens (JWT)

## Sources Consulted
- Rancher: Configure Keycloak (OIDC) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-oidc
- Rancher: Configure Generic OIDC - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-generic-oidc
- Rancher: Global Permissions - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher: Using API Tokens - https://ranchermanager.docs.rancher.com/v2.13/api/api-tokens
- Rancher: Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Auth0: Application Settings - https://auth0.com/docs/get-started/applications/application-settings
- Auth0: Actions Triggers: post-login - Event Object - https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-event-object
- Auth0: Actions Triggers: post-login - API Object - https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-api-object
- Auth0: JSON Web Token Claims - https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims
- Keycloak: GroupMembershipMapper - https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- Dex: Scopes and Claims - https://dexidp.io/docs/configuration/custom-scopes-claims-clients/

## Issues Found
- The Keycloak group-claim configuration was incomplete and partly wrong. I replaced it with the mapper values Rancher documents today, added the required audience and group-path mappers, and noted the Keycloak role mappings needed for user/group search.
- The Auth0 section referred to legacy "rules or actions" and assumed the claim should always be set. I updated it to use a current Auth0 Action and only add the custom claim when Auth0 roles are actually present.
- The Rancher configuration section mixed Keycloak-specific and Generic OIDC fields. I replaced the nonexistent Token Endpoint, User Info Endpoint, and JWKS URL form fields with the current Rancher Keycloak OIDC fields and added the Keycloak 17+ `Specify (advanced)` endpoint override caveat from Rancher's docs.
- The claim-mapping section described UID, username, and email mapping fields that Rancher's current OIDC UI does not expose that way. I corrected it to Rancher's documented behavior: `sub` is the unique PrincipalID, and Generic OIDC supports custom mapping for `name`, `email`, and `groups`.
- The scopes section implied Rancher exposes a direct scopes configuration field and included `offline_access` as if it were part of Rancher's setup flow. I rewrote it to describe provider-side claim availability instead, and kept the examples aligned with current provider docs.
- The test section referenced a separate Test button and used a fragile JWT decoding command that does not reliably handle base64url payloads. I corrected the flow to Rancher's enable-time validation behavior and replaced the decode example with a robust base64url-safe snippet.
- The advanced configuration section incorrectly labeled Rancher's `auth-token-max-ttl-minutes` setting as OIDC token refresh behavior. I renamed and clarified it as Rancher's maximum API token TTL.
- The private CA guidance omitted Rancher's documented `additionalTrustedCAs=true` prerequisite for the `tls-ca-additional` secret path. I corrected that and aligned the troubleshooting guidance with issuer/discovery and CA-chain validation instead of raw JWKS field troubleshooting.

## Review Notes
- The post is now technically consistent with Rancher's current documentation as of May 7, 2026.
- Keycloak 17 and newer need manual endpoint overrides in Rancher because generated values still include `/auth`, which only matches Keycloak 16 and older.
- The Auth0 example maps Auth0 roles into a group-style custom claim for Rancher RBAC. That is valid, but whether those values represent roles, groups, or another tenant-specific concept still depends on the Auth0 tenant configuration.
