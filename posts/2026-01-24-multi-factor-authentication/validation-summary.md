# Validation Summary: How to Configure Multi-Factor Authentication

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Multi-factor authentication (MFA)
- Time-based one-time passwords (TOTP)
- PyOTP
- Flask
- WebAuthn / FIDO2
- py_webauthn
- SMS verification
- Redis
- PostgreSQL
- Python backup-code generation and hashing
- Mermaid diagrams

## Sources Consulted
- PyOTP documentation: https://pyauth.github.io/pyotp/
- py_webauthn documentation: https://duo-labs.github.io/py_webauthn/
- py_webauthn registration guide: https://duo-labs.github.io/py_webauthn/registration.html
- py_webauthn authentication guide: https://duo-labs.github.io/py_webauthn/authentication.html
- MDN Web Authentication API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- Redis SETEX documentation: https://redis.io/docs/latest/commands/setex/
- Redis SET documentation: https://redis.io/docs/latest/commands/set/
- Flask jsonify documentation: https://flask.palletsprojects.com/en/stable/api/
- Python secrets documentation: https://docs.python.org/3/library/secrets.html

## Issues Found
- WebAuthn `exclude_credentials` and `allow_credentials` used plain dictionaries. Updated them to use `PublicKeyCredentialDescriptor` objects with base64url-decoded credential IDs, matching py_webauthn's documented API.
- WebAuthn registration options were returned with `jsonify(options)`, but py_webauthn option objects contain byte fields and need JSON conversion. Updated the example to use `options_to_json()` and return the parsed JSON object.
- WebAuthn verification generated options with user verification required but did not enforce user verification during response verification. Added `require_user_verification=True` to both registration and authentication verification calls.
- The SMS verification snippet used `json.dumps()` and `json.loads()` without importing `json`. Added the missing import.
- The MFA rate-limiting snippet referenced Flask `session` without importing it. Added the missing import.
- Redis examples used `setex()`, which maps to the deprecated Redis `SETEX` command. Updated them to use `set(..., ex=...)`, the current Redis-recommended form.
- The PostgreSQL schema used inline `INDEX` declarations inside `CREATE TABLE`, which is not valid PostgreSQL syntax. Moved those indexes to separate `CREATE INDEX` statements.

## Review Notes
- Python fenced code blocks were checked with `ast.parse` after edits.
- The WebAuthn option-generation paths were runtime-checked against the current `webauthn` package API.
- Several functions in the Flask examples, such as `get_user_email()` and `store_webauthn_credential()`, are intentionally application-specific placeholders rather than complete implementations.
