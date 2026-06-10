# Validation Summary: How to Create Vault Identity Tokens

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- HashiCorp Vault (Identity Secrets Engine, OIDC provider functionality)
- OIDC (OpenID Connect) discovery and JWKS
- JSON Web Tokens (JWT) — RS256, ES256, EdDSA signing algorithms
- AWS STS AssumeRoleWithWebIdentity
- GCP Workload Identity Federation (gcloud)
- Kubernetes auth method for Vault
- PyJWT (Python JWT validation)
- go-oidc (Go OIDC token validation)
- HCL (Vault policy syntax)
- Go template syntax for identity token claim templates

## Sources Consulted
- HashiCorp Vault Identity Token docs: https://developer.hashicorp.com/vault/docs/secrets/identity/identity-token
- HashiCorp Vault Identity Tokens API: https://developer.hashicorp.com/vault/api-docs/secret/identity/tokens
- HashiCorp Vault Identity Entity API: https://developer.hashicorp.com/vault/api-docs/secret/identity/entity
- GCP Workload Identity Federation docs: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
- AWS STS AssumeRoleWithWebIdentity API reference
- PyJWT documentation (PyJWKClient, jwt.decode)
- go-oidc v3 library reference: github.com/coreos/go-oidc/v3/oidc

## Issues Found
1. **Mermaid sequence diagram referenced the wrong JWKS path.** The diagram said `Fetch JWKS from /.well-known/jwks.json`, but Vault's actual JWKS endpoint is `/v1/identity/oidc/.well-known/keys` (not `jwks.json` as used by many other OIDC providers). Updated the diagram to reference `/.well-known/keys` so it matches Vault's real endpoint, which is consistent with the rest of the post (curl examples and the Python code both use the correct `/keys` path).

## Review Notes
- All `vault write identity/oidc/key/...` parameters verified: `algorithm`, `rotation_period`, `verification_ttl`, and `allowed_client_ids` are valid fields on the OIDC named-key API.
- Standard JWT claims described (`iss`, `sub`, `aud`, `iat`, `exp`) match the five required OIDC claims documented for Vault identity tokens.
- The OIDC discovery document fields shown (issuer, jwks_uri, supported algorithms RS256/RS384/RS512/ES256/ES384/ES512/EdDSA, empty authorization/token/userinfo endpoints) match Vault's actual response shape.
- Entity metadata CLI form `metadata=key=value` (repeated) is the correct Vault CLI convention for map[string]string fields; the shell strips the wrapping quotes shown in the post.
- PyJWT example uses `PyJWKClient` (requires PyJWT >= 2.0; EdDSA support requires PyJWT >= 2.6). The `jwks_response = requests.get(jwks_url)` line is unused since `PyJWKClient` performs its own fetch — harmless but slightly redundant; not a technical error.
- Go example uses the current `github.com/coreos/go-oidc/v3/oidc` import path and APIs (`NewProvider`, `Verifier`, `Verify`, `Claims`).
- AWS trust policy condition key format `vault.example.com:sub` matches the documented OIDC condition key format (issuer hostname + `:` + claim).
- GCP `gcloud iam workload-identity-pools providers create-oidc` flags and attribute-mapping syntax confirmed against current Google Cloud documentation.
- Vault policy templating with `{{identity.entity.id}}` in path segments is a documented and supported feature.
