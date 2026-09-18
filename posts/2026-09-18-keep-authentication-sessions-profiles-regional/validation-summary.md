# Validation Summary: How to Keep Authentication, Sessions, and User Profiles Inside Regional Data Boundaries

## Status
validated

## Post Type
Technical architecture and implementation guide. The post includes an HTTP Set-Cookie example and concrete guidance on identity-provider configuration, token validation, session storage, recovery, and migration, so it qualifies for technical review.

## Technologies Covered
- Amazon Cognito user pools and multi-Region replication
- AWS messaging integrations, Lambda triggers, and log exports
- OpenID Connect (OIDC), OAuth 2.0, and federated authentication
- JSON Web Tokens (JWT), signing, encryption, and issuer key selection
- HTTP cookies and server-side sessions
- Regional identity storage, account recovery, logout, and identity migration

## Sources Consulted
- Amazon Cognito regional data considerations: https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html
- Amazon Cognito multi-Region replication for user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-multi-region.html
- OpenID Connect Core 1.0, including ID Token validation, UserInfo, and claim stability: https://openid.net/specs/openid-connect-core-1_0.html
- MDN Set-Cookie reference, including cookie prefixes, Domain, Secure, HttpOnly, and SameSite: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- RFC 7519, JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519.html
- RFC 8725, JSON Web Token Best Current Practices, especially issuer, subject, audience, and untrusted claim handling: https://www.rfc-editor.org/rfc/rfc8725.html
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth 2.0 Form Post Response Mode: https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Amazon Cognito CSV user import documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html
- Amazon Cognito user migration Lambda trigger documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html
- Author profile link destination: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

The README.md was left unchanged.

## Review Notes
- Regional boundaries: The distinction between regional server storage, external integration destinations, and browser access location is sound. The proposed inventory and synthetic-account checks are architectural validation steps; this review did not inspect a deployed environment or certify its residency compliance.
- Cognito: Official documentation confirms optional replication of directory updates to another region. Eligibility depends on infrastructure, feature plan, and key configuration. The post correctly asks readers to inspect the actual configuration rather than treating the general regional-storage statement as an unconditional guarantee. Replica-specific messaging, Lambda, and logging settings are documented.
- Identity validation: OIDC requires checking the ID Token issuer and intended client audience, along with expiry and applicable protocol requirements. Using the issuer and subject together as the identity key is correct. Tenant authorization remains an application responsibility. Token-specific validation rules must still be followed; the guide does not supply a universal validator for every access-token format.
- JWT contents: Signing and encryption are distinct. A signed, unencrypted JWT does not conceal its claims, so minimizing personal information in tokens is appropriate.
- Cookie example: The header is syntactically valid and meets the documented __Host- prefix requirements when set from HTTPS in supporting browsers. The session reference is an illustrative placeholder; production values must be unpredictable. The cookie stores a reference while the associated session data remains server-side.
- Federated callbacks: Explicit SameSite=Lax generally excludes cookies on cross-site POST callbacks. The form_post specification uses POST, supporting the post's instruction to test response modes and CSRF controls. Host scoping does not determine the geographic location of session storage or backups.
- Recovery and migration: Enumeration-resistant discovery, trusted redirect destinations, explicit identity mapping, and session invalidation are appropriate. The prohibition is specifically against unsupported exports; it does not incorrectly prohibit documented password-hash imports. Cognito documents both CSV import options and migration through a Lambda trigger.
- Links and execution scope: The referenced documentation pages and author profile resolved to the expected resources. There are no terminal commands, executable application examples, pinned package versions, or deployment configuration files to run. The HTTP header was reviewed against documentation; no live sign-in or browser integration test was performed.
