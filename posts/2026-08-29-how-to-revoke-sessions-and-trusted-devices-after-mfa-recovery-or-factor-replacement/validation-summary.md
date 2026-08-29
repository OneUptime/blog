# Validation Summary: How to Revoke Sessions and Trusted Devices After MFA Recovery or Factor Replacement

## Status
validated

## Post Type
Security implementation guide

## Technologies Covered
- Multi-factor authentication (MFA), authenticator recovery, renewal, and replacement
- Server-side session management and security epochs
- Trusted-browser credentials and device sessions
- JSON Web Tokens (JWTs), including `sid` and `jti` relationships
- OAuth 2.0 token revocation, refresh-token rotation, and token introspection
- OpenID Connect Back-Channel Logout
- Sender-constrained OAuth tokens

## Sources Consulted
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [NIST SP 800-63B-4: Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b.html#recovery)
- [RFC 7009: OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [RFC 7662: OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)
- [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html)
- [OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Application Security Verification Standard 5.0: V7 Session Management](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md)

## Issues Found
- The old-factor guidance could leave a lost or suspected-compromised authenticator active until its replacement was proven. It now distinguishes routine renewal, where the replacement should be bound and successfully used first, from loss or compromise, where NIST requires prompt suspension or invalidation; suspected compromise is handled conservatively the same way.
- The workflow could be read as treating account recovery itself as sufficient to issue a normal authenticated session. It now permits only a short-lived, narrowly authorized recovery-completion session and requires authentication with the replacement authenticator before a normal authenticated session is issued.
- The trusted-browser discussion did not state NIST's restriction on using remembered-browser cookies in place of authentication. It now notes the narrow AAL2 reauthentication exception.
- “Token introspection at the resource server” could imply that the RFC 7662 endpoint is hosted there. It now says introspection is performed by the resource server, which calls the introspection endpoint.
- The conclusion presented a security epoch as the only valid account-wide invalidation mechanism. It now allows an equivalent mechanism, consistent with OWASP ASVS alternatives such as per-user issuance cutoffs, token termination lists, or per-user signing-key rotation.

## Review Notes
- `security_epoch` and `factor_generation` are application-defined architecture patterns, not standardized NIST, OAuth, or JWT field names. They are sound when every relevant validation path enforces them with risk-appropriate cache staleness.
- Automatic revocation of all sessions after recovery is a deliberately strict policy. OWASP ASVS 5.0 requires offering session termination after an authentication-factor change; an application may choose automatic revocation based on its threat model.
- No executable commands or framework-specific configuration are present. The text block is implementation-neutral pseudocode and is internally consistent after the corrections above.
- All reference URLs in the post resolved to the intended official or authoritative documents during review.
