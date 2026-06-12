# Validation Summary: How to Use Keycloak Authorization Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Keycloak Authorization Services
- OAuth 2.0 / UMA authorization grant
- Keycloak resources, scopes, policies, and permissions
- Keycloak JavaScript policies
- Keycloak Node.js adapter / policy enforcer
- Spring Security OAuth2 Resource Server JWT support
- Java
- JavaScript
- curl

## Sources Consulted
- Keycloak Authorization Services Guide: https://www.keycloak.org/docs/latest/authorization_services/index.html
- Keycloak Node.js adapter documentation: https://www.keycloak.org/securing-apps/nodejs-adapter
- Keycloak Policy Enforcer documentation: https://www.keycloak.org/securing-apps/policy-enforcer
- Keycloak Downloads page for adapter status: https://www.keycloak.org/downloads
- Keycloak Resource Java API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/authorization/model/Resource.html
- Spring Security JwtAuthenticationConverter API documentation: https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/oauth2/server/resource/authentication/JwtAuthenticationConverter.html

## Issues Found
- The section titled "Token introspection with permissions" described a token endpoint UMA authorization request, not OAuth2 token introspection. Changed the heading and explanation to "Request an RPT with permissions."
- The UMA token endpoint examples used only `client_id` and `client_secret` while describing a user-specific authorization decision. Updated them to use a bearer access token so permissions are evaluated in the subject context represented by that token.
- The examples did not request resource names in the RPT, while the Spring Security example converted permission resource names into authorities. Added `response_include_resource_name=true` to the RPT request example.
- The Node.js example used `keycloak.protect('document:read')`, which is role-based protection in the Keycloak Node.js adapter. Changed it to `keycloak.enforcer('document:read')`, which is the documented resource-based authorization middleware.
- The Node.js adapter is currently documented by Keycloak as deprecated. Updated the surrounding text to call it a legacy Node.js option rather than presenting it as the preferred current adapter.
- The permission JSON used `"type": "resource"` while also binding a `read` scope. Changed it to `"type": "scope"` to match a scope-based permission.
- The JavaScript policy section omitted the current Keycloak caveat that JavaScript policies should be deployed to the server rather than uploaded directly through the admin console. Added a brief note.
- The Spring Security JWT converter assumed `authorization` and `permissions` claims were always present and used only the older `rsname` permission key. Updated it to handle missing claims and prefer `resource_set_name` with an `rsname` fallback.
- The initial setup steps did not mention enabling client authentication for a server-side resource server. Added that step to align with the current Keycloak setup flow.

## Review Notes
- The remaining examples are illustrative snippets and omit imports, application bootstrap code, and production hardening details such as external session stores and token validation configuration.
- JavaScript policies remain supported, but operationally they require server-side deployment and are harder to audit than built-in policy types.
