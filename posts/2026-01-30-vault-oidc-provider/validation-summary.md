# Validation Summary: How to Build Vault OIDC Provider

## Status
validated

## Post Type
Guide

## Technologies Covered
- HashiCorp Vault identity secrets engine — OIDC provider (identity/oidc/*)
- OIDC / JWKS / .well-known discovery
- Python Flask + Authlib (illustrative client)
- Kubernetes kube-apiserver OIDC auth + kubelogin (kubectl oidc-login)

## Sources Consulted
- Identity Secret Backend: Identity Tokens — HTTP API (HashiCorp Developer) — https://developer.hashicorp.com/vault/api-docs/secret/identity/tokens (verified identity/oidc/key params rotation_period, verification_ttl, algorithm with RS256 default; the identity/oidc/key/:name/rotate endpoint; .well-known/keys and .well-known/openid-configuration path naming)
- OIDC Identity Provider — HTTP API (HashiCorp Developer) — https://developer.hashicorp.com/vault/api-docs/secret/identity/oidc-provider (verified assignment params entity_ids/group_ids; scope params template/description and that template accepts escaped or base64 JSON; client params key/redirect_uris/assignments/id_token_ttl/access_token_ttl and that the response returns client_id and client_secret; provider params issuer/allowed_client_ids/scopes_supported; provider well-known endpoints)
- OIDC Provider concepts (HashiCorp Developer) — https://developer.hashicorp.com/vault/docs/concepts/oidc-provider (verified scope template is a raw JSON string using {{identity.entity.groups.names}} / {{identity.entity.metadata.email}} syntax; confirmed openid scope yields sub = entity ID, plus iss/aud/iat/exp)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- identity/oidc/key fields rotation_period, verification_ttl, and algorithm="RS256" are correct; RS256 is the documented default and RS384/RS512/ES256/ES384/ES512/EdDSA are also allowed.
- The assignment uses group_ids; entity_ids is also a valid field (post correctly uses group_ids for a group-based assignment).
- Client creation fields (key, redirect_uris, assignments, id_token_ttl, access_token_ttl) match the docs, and the docs confirm the response returns client_id and client_secret. Note the documented default for id_token_ttl/access_token_ttl is 24h; the post sets explicit 1h values, which is valid.
- Scope template is passed as a raw JSON string in the post (e.g. template='{"groups": {{identity.entity.groups.names}}}'). The API also accepts escaped or base64-encoded JSON, but a raw JSON string with the templating placeholders is the form shown in the official concepts docs, so the post is correct and not an error.
- The provider well-known paths are confirmed exactly: /v1/identity/oidc/provider/<name>/.well-known/openid-configuration and /v1/identity/oidc/provider/<name>/.well-known/keys. The keys path is ".well-known/keys" (not "jwks"); the discovery document's jwks_uri points to that keys endpoint.
- Manual rotation command vault write -f identity/oidc/key/app-key/rotate matches the documented identity/oidc/key/:name/rotate endpoint.
- Kubernetes mapping: openid scope sets sub to the Vault entity ID, so oidc-username-claim: "sub" is valid; groups claim requires the custom groups scope to be requested and listed in the provider scopes_supported, which the post does — consistent with the troubleshooting note about missing claims.
- The Flask/Authlib example is illustrative third-party-library usage; server_metadata_url (discovery URL), authorize_redirect, and authorize_access_token usage are plausible and standard Authlib patterns. Not deeply scrutinized per instructions.
