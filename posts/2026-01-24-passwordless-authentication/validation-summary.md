# Validation Summary: How to Implement Passwordless Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Passwordless authentication
- Magic links
- WebAuthn / passkeys / FIDO2
- Python
- FastAPI
- Redis
- SMTP email
- JavaScript WebAuthn browser APIs
- Email and SMS OTP
- Rate limiting

## Sources Consulted
- py_webauthn documentation: https://duo-labs.github.io/py_webauthn/
- py_webauthn registration guide: https://duo-labs.github.io/py_webauthn/registration.html
- py_webauthn authentication guide: https://duo-labs.github.io/py_webauthn/authentication.html
- py_webauthn source for option types and helpers: https://github.com/duo-labs/py_webauthn
- MDN Web Authentication API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- MDN PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(): https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isUserVerifyingPlatformAuthenticatorAvailable_static
- FastAPI response cookies documentation: https://fastapi.tiangolo.com/advanced/response-cookies/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- NIST SP 800-63B Digital Identity Guidelines: https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Issues Found
- The magic link and OTP Python snippets used `json.dumps()` / `json.loads()` without importing `json`. Added the missing imports.
- Several snippets used `datetime.utcnow()`, which Python documentation deprecates as of Python 3.12. Replaced it with `datetime.now(timezone.utc)` and added `timezone` imports.
- The py_webauthn examples passed plain dictionaries for `exclude_credentials` and `allow_credentials`, but the library documentation and type signatures expect `PublicKeyCredentialDescriptor` instances. Updated both lists to use `PublicKeyCredentialDescriptor`.
- The WebAuthn server snippet used `datetime` without importing it. Added the required import.
- The unified auth service called `user_has_passkeys()` even though `PasskeyAuth` did not define it. Added a small method backed by `credential_store.get_user_credentials()`.
- The unified auth service awaited synchronous email/SMS sender methods and omitted required `expiry_minutes` arguments. Updated the calls to match the sender classes shown in the post.
- Passkey verification in the unified service started authentication with a user-specific challenge but completed authentication without passing the same `user_id`. Updated the passkey branch to resolve the user and pass the ID to `complete_authentication()`.
- The rate limiter mixed Flask imports (`flask.request`, `jsonify`) with FastAPI/Starlette request access (`request.app.state`, `request.client`, `await request.json()`) and omitted `asyncio`. Reworked the snippet to use FastAPI `Request` and `HTTPException`.
- The opening claim and benefits diagram overstated passwordless security by implying all passwordless methods eliminate phishing and stolen-credential risks. Adjusted the wording to "reduces" and "can be phishing resistant" because NIST and MDN distinguish WebAuthn-style cryptographic authentication from OTP/out-of-band methods.

## Review Notes
The examples remain illustrative and assume application-provided pieces such as `credential_store`, `session_store`, `get_or_create_user()`, `create_session()`, `send_email()`, and configured Redis/email/SMS clients. For production, the challenge store should be persistent and scoped per authentication ceremony, and teams should consider NIST's caveats around SMS and email-based authentication for higher-assurance systems.
