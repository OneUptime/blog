# Validation Summary: How to Implement Service Provider Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SAML 2.0 (Security Assertion Markup Language)
- Service Provider (SP) / Identity Provider (IdP) concepts
- Node.js
- Passport.js
- `@node-saml/passport-saml` (v5) library
- `@node-saml/node-saml` (underlying SAML implementation)
- Express.js (routes, sessions)
- Mermaid diagrams (sequence and flowchart)
- X.509 certificates, RSA, SHA-256

## Sources Consulted
- [@node-saml/passport-saml GitHub repo](https://github.com/node-saml/passport-saml) — Strategy constructor API and README example
- [@node-saml/passport-saml strategy.ts source](https://github.com/node-saml/passport-saml/blob/master/src/strategy.ts) — Verified constructor requires two verify callbacks and `logout(req, callback)` method signature
- [@node-saml/node-saml types.ts](https://github.com/node-saml/node-saml/blob/master/src/types.ts) — Verified SamlConfig field names (`idpCert`, `publicCert`, `privateKey`, `callbackUrl`, etc.)
- SAML 2.0 OASIS metadata namespace and binding URNs (e.g., `urn:oasis:names:tc:SAML:2.0:metadata`, `urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST`)
- SAML 1.1 nameid-format URN (`urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`)
- Microsoft/WS claim attribute URIs (givenname, surname, groups schemas)

## Issues Found

1. **Incorrect config field name `cert` → `publicCert`** — In the Basic Configuration code block, the option `cert: process.env.SAML_SP_CERTIFICATE` is not a valid field name in `@node-saml/passport-saml` v5 (the version implied by importing from `@node-saml/passport-saml`). The SP's signing certificate field is named `publicCert`. The IdP cert field `idpCert` (used correctly elsewhere in the post) was already the v5 name. Fixed by renaming `cert` to `publicCert`.

2. **Missing logout verify callback in `SamlStrategy` constructor** — `@node-saml/passport-saml` v5's `Strategy` constructor requires *two* verify callbacks: `signonVerify` and `logoutVerify`. The post provided only one. Without the second callback the library throws / fails to construct properly. Fixed by adding a second `(profile, done)` callback for logout verification that looks up the user by `nameID`.

## Review Notes

- The SAML 2.0 metadata XML is syntactically and semantically correct: `EntityDescriptor` / `SPSSODescriptor` with `AuthnRequestsSigned`, `WantAssertionsSigned`, `protocolSupportEnumeration`, `KeyDescriptor`, and `AssertionConsumerService` are all standard OASIS SAML 2.0 elements with the correct namespaces and binding URN (`HTTP-POST`).
- The SAML authentication sequence diagram is accurate.
- The `generateServiceProviderMetadata(decryptionCert, signingCert)` call is correct — the same cert may be reused for both decryption and signing if the key usage permits it.
- The `samlStrategy.logout(req, callback)` usage matches the v5 source: `logout(req, (err, url) => void)`.
- `wantAssertionsSigned`, `wantAuthnResponseSigned`, `signatureAlgorithm`, `digestAlgorithm`, `acceptedClockSkewMs`, `maxAssertionAgeMs`, `identifierFormat`, `callbackUrl`, `issuer`, `entryPoint`, `idpCert`, `privateKey` are all valid options in the current node-saml type definitions.
- The replay-prevention example is functionally correct, but the in-memory `Map` is illustrative only — in production with multiple instances, a shared store (Redis, database) is needed; the post does not claim otherwise but a reader should be aware.
- `acceptedClockSkewMs: 5000` (5 seconds) is on the strict side; many production deployments use 30,000–60,000 ms to tolerate real-world clock drift. Not incorrect, just worth noting.
- The post does not pin a specific version of `@node-saml/passport-saml`. The fixes above assume v5+ (the only version published under that scope). If a reader installs an older non-scoped `passport-saml`, the API differs — but the post imports from `@node-saml/passport-saml` so v5 is the correct assumption.
- The `failureFlash: true` option in the ACS route handler requires `connect-flash` middleware to be wired up; the post doesn't mention this. Not a bug, just a setup detail an implementer must handle.
