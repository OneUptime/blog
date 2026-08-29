# Validation Summary: How to Authenticate CI/CD and Service Accounts When Human Users Must Use MFA

## Status
validated

## Post Type
Security guide

## Technologies Covered

- CI/CD workload identity federation
- OpenID Connect (OIDC) and JSON Web Tokens (JWTs)
- OAuth 2.0 token exchange
- Mutual-TLS certificate-bound OAuth access tokens
- SPIFFE, SPIRE, SVIDs, and the SPIFFE Workload API
- Time-based one-time passwords (TOTP) and multi-factor authentication (MFA)
- IAM, service accounts, secrets management, and emergency access
- GitHub Actions OIDC, environments, reusable workflows, and runners

## Sources Consulted

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens](https://datatracker.ietf.org/doc/html/rfc8705)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700)
- [NIST SP 800-63B-4: Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [GitHub Actions: OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitHub Actions: OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions: Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Actions: Compromised runners](https://docs.github.com/en/actions/concepts/security/compromised-runners)
- [SPIRE Concepts](https://spiffe.io/docs/latest/spire-about/spire-concepts/)
- [SPIRE Use Cases](https://spiffe.io/docs/latest/spire-about/use-cases/)
- [SPIFFE Workload API](https://spiffe.io/docs/latest/spiffe-specs/spiffe_workload_api/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## Issues Found

- The opening sentence attributed both loss of attribution and loss of factor independence equally to refresh tokens, shared passwords, and copied TOTP seeds. It now distinguishes the attribution problem from the factor-independence problem caused by storing a TOTP seed alongside another authenticator for the same human account.
- The human-MFA/workload-authentication comparison overstated what authentication proves by referring to a person's presence and the exact code running. It now describes proof of claimant control and an attested workload execution context.
- “Pin validation” incorrectly grouped dynamic token validation, such as checking `exp`, with fixed trust-policy constraints. It now distinguishes validation of standard token properties from constraining trust with relevant claims.
- The SPIFFE paragraph treated the standard as the component that attests workloads and implied that every SVID contains a certificate and key. It now identifies SPIRE as the implementation performing attestation and issuance, and limits the certificate/private-key statement to X.509-SVIDs.
- The post described an unbound “MFA passed” flag as inherently replayable. It now says such a flag can be replayed or applied to the wrong release, preserving the warning without excluding separate single-use replay controls.
- “mTLS-bound OAuth tokens” was replaced with the precise RFC 8705 term “mutual-TLS certificate-bound OAuth access tokens.”

## Review Notes

- The `authorize_deploy(...)` block is clearly marked as pseudocode and is technically coherent as an authorization model; it is not presented as an executable API.
- GitHub claim-filtering capabilities vary by cloud provider. GitHub also introduced immutable default `sub` values containing owner and repository IDs for applicable repositories beginning July 15, 2026. The post remains accurate because it does not hard-code a subject layout and tells readers to enforce the format their trust policy expects.
- All seven links in the post resolve to the intended material. The older SPIFFE Concepts URL redirects to its current canonical location.
- No executable commands, configuration files, deprecated APIs, or version-pinned code examples are present.
