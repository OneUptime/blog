# Validation Summary: How to Configure OIDC Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib OIDC Authenticator Extension
- OpenID Connect
- OAuth 2.0 / JWT
- OTLP receivers and exporters
- Resource processor
- Routing connector
- Kubernetes
- Auth0, Keycloak, Google, Microsoft Entra ID, and AWS Cognito

## Sources Consulted
- OpenTelemetry Collector Contrib OIDC Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/oidcauthextension
- OIDC Authenticator Extension Go package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/oidcauthextension
- OIDC Authenticator Extension source configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/oidcauthextension/config.go
- OIDC Authenticator Extension authentication data source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/oidcauthextension/authdata.go
- OpenTelemetry Collector extension registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector authenticator extension documentation: https://opentelemetry.io/docs/collector/extend/custom-component/extension/authenticator/
- OpenTelemetry Collector exporter registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/routingprocessor
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0-final.html
- JSON Web Key (JWK) RFC 7517: https://datatracker.ietf.org/doc/html/rfc7517

## Issues Found
- The examples used the old top-level `issuer_url`, `audience`, `username_claim`, `groups_claim`, and `issuer_ca_path` OIDC configuration. That legacy structure is still accepted but deprecated, so the examples were updated to the current `providers` list.
- The advanced example used unsupported `audiences` and claim-mapping `attribute` fields. These fields are not part of the OIDC extension configuration, so they were removed and claim extraction was changed to processor `from_context` values such as `auth.claims.tenant_id`.
- Several snippets implied that `groups_claim` directly enforces authorization. The extension exposes group membership in authentication context; authorization must be implemented separately. The wording and comments were corrected.
- The architecture diagram implied that the collector asks the identity provider to validate every token. The extension fetches OIDC metadata/JWKS and validates signatures locally, so the diagram labels were corrected.
- The Keycloak example used `realm_access.roles` as a dotted claim path. The OIDC extension looks up claim names directly, so the example now uses a top-level `groups` claim.
- The Keycloak example filtered on an `authenticated` span attribute that was never added. It now demonstrates adding `auth.subject` to resource attributes.
- The multi-tenant example used an invalid OIDC claim-mapping block and the deprecated routing processor. It now extracts the tenant claim via `from_context` and uses the current routing connector shape.
- The basic and production examples used the deprecated `logging` exporter and `loglevel`. They now use the `debug` exporter with `verbosity`.
- The Auth0 JavaScript example imported `express-oauth2-jwt-bearer` but never used it. The unused import was removed.

## Review Notes
All YAML snippets were parsed successfully after the corrections. The examples remain illustrative and still require real issuer URLs, audiences, certificates, and backend endpoints before they can run in a production collector.
