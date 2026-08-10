# Validation Summary: Why OIDC Group or Role Claims Are Missing—and Where to Retrieve Authorization Data

## Status

validated

## Post Type

Technical troubleshooting guide and reference

## Technologies Covered

- OpenID Connect (OIDC) Core 1.0
- OIDC ID tokens, UserInfo, Discovery, scopes, and claims requests
- OAuth 2.0 access tokens, bearer token usage, and token introspection
- JSON Web Tokens (JWTs) and the RFC 9068 JWT access-token profile
- SCIM 2.0 Users, Groups, memberships, and directory access
- Role-based access control (RBAC) and application-owned authorization policy

## Sources Consulted

- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html), especially Sections 2, 3.1.3.7, 5.1, 5.3–5.5, 5.7, 16.8, and 16.18
- [OpenID Connect Discovery 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-discovery-1_0.html), especially Section 3 (`userinfo_endpoint` metadata)
- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749), especially Sections 1.4, 3.3, 6, and 7
- [RFC 6750 — OAuth 2.0 Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750), especially Section 2.1
- [RFC 7662 — OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662), especially Sections 1 and 2
- [RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://datatracker.ietf.org/doc/html/rfc9068), especially Sections 2.1–2.2.3.1, 4–6, and 7.2
- [RFC 7643 — SCIM Core Schema](https://datatracker.ietf.org/doc/html/rfc7643), especially Sections 4.1, 4.1.2, 4.2, and 8.2
- [RFC 7644 — SCIM Protocol](https://datatracker.ietf.org/doc/html/rfc7644), especially Sections 1–3, 3.3–3.5, and 7.4
- [RFC 9865 — Cursor-Based Pagination of SCIM Resources](https://datatracker.ietf.org/doc/html/rfc9865)
- [RFC 9967 — SCIM Profile for Security Event Tokens](https://datatracker.ietf.org/doc/html/rfc9967), especially Section 1

## Issues Found

- The access-token row stated that the intended resource server is identified by the token's audience. OAuth 2.0 access tokens can be opaque and do not universally contain an `aud` claim. The row now identifies the target resource server(s) generally and limits the `aud` statement to token profiles that define that claim, such as RFC 9068.
- The SCIM/directory heading described lookup data as “current,” although SCIM retrieval does not itself guarantee synchronization freshness. The heading now says “lookup-based authorization data.”
- The freshness section categorically said shorter token lifetimes reduce stale decisions and live lookups improve freshness. Both depend on renewal, caching, provider, and policy behavior, so “can reduce” and “can improve” now make those tradeoffs precise.

No other technical issues were found.

## Review Notes

- The UserInfo HTTP example is syntactically valid and follows OIDC Core and RFC 6750 guidance by using `GET` with a bearer token in the `Authorization` header.
- The post's signature-validation advice is a conservative deployment policy. OIDC Core has a narrow Authorization Code Flow allowance to use TLS server validation instead of checking the signature of an ID token received directly from the Token Endpoint; requiring signature validation remains sound.
- RFCs 7643 and 7644 remain valid but have been updated, not obsoleted, by RFCs 9865 and 9967. Those updates do not change the post's foundational SCIM claims.
- The post contains no CLI commands, language APIs, dependency versions, or configuration examples that could be deprecated.
