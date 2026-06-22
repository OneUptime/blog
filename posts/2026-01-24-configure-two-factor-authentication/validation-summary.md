# Validation Summary: How to Configure Two-Factor Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Two-factor authentication (2FA) and multi-factor authentication (MFA)
- TOTP / HOTP concepts
- PyOTP
- Flask and Flask-Limiter
- Speakeasy
- QR code provisioning
- Backup / recovery codes
- WebAuthn / FIDO2
- SimpleWebAuthn server and browser packages

## Sources Consulted
- PyOTP documentation: https://pyauth.github.io/pyotp/
- RFC 6238, TOTP: Time-Based One-Time Password Algorithm: https://datatracker.ietf.org/doc/html/rfc6238
- Speakeasy README: https://github.com/speakeasyjs/speakeasy/blob/master/README.md
- SimpleWebAuthn server documentation: https://simplewebauthn.dev/docs/packages/server
- SimpleWebAuthn browser documentation: https://simplewebauthn.dev/docs/packages/browser
- SimpleWebAuthn custom user IDs documentation: https://simplewebauthn.dev/docs/advanced/server/custom-user-ids
- Flask-Limiter API documentation: https://flask-limiter.readthedocs.io/en/stable/api.html
- OWASP Multifactor Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- NIST SP 800-63B authenticators guidance: https://pages.nist.gov/800-63-4/sp800-63b/authenticators/
- W3C WebAuthn Level 3 specification: https://www.w3.org/TR/webauthn-3/

## Issues Found
- The Flask TOTP setup example called `generate_backup_codes(user)`, but the backup-code helper takes a count and returns both plain and hashed codes. Updated the setup flow to call `generate_backup_codes()`, store `hashed_codes`, and return only the plain backup codes to the user.
- The backup-code example used unsalted SHA-256 for short recovery codes. Replaced it with Werkzeug's password-hashing helpers so stored backup-code verifiers are harder to crack if the database is exposed.
- The SimpleWebAuthn server example used a string `userID`, which current SimpleWebAuthn versions reject. Removed the string `userID` field and relied on the library-generated WebAuthn user ID.
- The SimpleWebAuthn registration example stored old `registrationInfo` fields (`credentialID`, `credentialPublicKey`, and `counter`). Updated it to use the current `registrationInfo.credential` shape and store `id`, `publicKey`, `counter`, `transports`, and the generated `webAuthnUserID`.
- The WebAuthn authentication options example referenced the old credential field name `credentialID`. Updated it to use the current stored credential `id` and include transports.
- The client-side WebAuthn example manually converted base64 values and called `navigator.credentials` directly. Replaced it with `@simplewebauthn/browser`'s `startRegistration()` and `startAuthentication()` helpers, matching the current SimpleWebAuthn JSON API and avoiding base64url conversion errors.
- The Flask-Limiter example used the pre-current positional constructor style. Updated it to pass `key_func` first and `app=app` as required by the current Flask-Limiter API.
- The Flask-Limiter code used `timedelta` without importing it. Added `from datetime import datetime, timedelta` to the snippet.

## Review Notes
The post is technically relevant and now aligns with the current official APIs checked during review. The examples are still illustrative and omit surrounding application details such as model imports, session hardening, encrypted TOTP secret storage implementation, backup-code rotation UX, and a complete WebAuthn authentication verification endpoint.
