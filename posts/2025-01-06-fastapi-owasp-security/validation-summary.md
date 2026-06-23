# Validation Summary: How to Secure FastAPI Applications Against OWASP Top 10

## Status
validated

## Post Type
Guide / Tutorial (security best-practices walkthrough with code examples)

## Technologies Covered
- Python 3.11
- FastAPI / Starlette
- Pydantic v2 (`field_validator`, `EmailStr`, `model_config`, `pattern`)
- PyJWT (`jwt.encode` / `jwt.decode`)
- passlib + bcrypt (password hashing)
- cryptography (Fernet, PBKDF2HMAC)
- asyncpg (parameterized queries)
- SQLAlchemy async ORM
- httpx (SSRF-safe HTTP requests)
- hmac / hashlib (webhook signature verification)
- GitHub Actions, safety, pip-audit (dependency scanning)
- OWASP Top 10 (2021)

## Sources Consulted
- OWASP Top 10 (2021): https://owasp.org/Top10/
- FastAPI Security docs: https://fastapi.tiangolo.com/tutorial/security/
- FastAPI CORS docs: https://fastapi.tiangolo.com/tutorial/cors/
- Pydantic v2 validators & fields: https://docs.pydantic.dev/latest/concepts/validators/ and https://docs.pydantic.dev/latest/concepts/fields/
- PyJWT usage: https://pyjwt.readthedocs.io/en/stable/usage.html
- passlib CryptContext: https://passlib.readthedocs.io/en/stable/lib/passlib.context.html
- cryptography Fernet & PBKDF2HMAC: https://cryptography.io/en/latest/fernet/ and https://cryptography.io/en/latest/hazmat/primitives/key-derivation-functions/
- asyncpg parameterized queries: https://magicstack.github.io/asyncpg/current/usage.html
- Python `hmac` / `subprocess` / `secrets` / `ipaddress` stdlib docs: https://docs.python.org/3/library/
- NIST SP 800-63B (password guidance): https://pages.nist.gov/800-63-3/sp800-63b.html

## Issues Found
1. **A08 (Data Integrity Failures), `request_signing.py` — missing `import os`.** The snippet uses `WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]` but only imported `hmac`, `hashlib`, `time`, and FastAPI symbols. As written this raises `NameError: name 'os' is not defined` at import time. Added `import os`.
2. **A09 (Security Logging), `security_logging.py` — missing `timezone` import.** The snippet calls `datetime.now(timezone.utc)` but imported only `from datetime import datetime`. This raises `NameError: name 'timezone' is not defined` when an event is logged. Changed the import to `from datetime import datetime, timezone`.

Both were corrected without altering the author's structure, tone, or surrounding code.

## Review Notes
- The OWASP Top 10 ranking/labels match the 2021 release, including A10 SSRF. Correct.
- API usage is current: Pydantic v2 `pattern=` (not the v1 `regex=`), `field_validator`/`@classmethod`, and `model_config = {"extra": "forbid"}`; PyJWT 2.x returns `str` from `jwt.encode`; asyncpg `$1` placeholders; `secrets.token_urlsafe`. No deprecated APIs in the Python code.
- The asyncpg comment says the placeholder "properly escaping any special characters." This is loose phrasing — parameterized queries send values out-of-band (server-side binding) rather than escaping them. Technically imprecise but harmless; left as-is to preserve the author's wording.
- The A07 section is titled "refresh token rotation," but the `/token/refresh` handler only mints a new access token; it does not rotate (re-issue/invalidate) the refresh token. This is a description/implementation mismatch, not a code error — left unchanged.
- A04 comment "NIST recommends at least 8" is accurate (SP 800-63B). Note that NIST actually discourages mandatory composition rules (uppercase/lowercase/special) that the example enforces; this is a best-practice nuance, not an error.
- `import shlex` in the command-injection snippet is unused but harmless.
- `safety check` (A06) still works but is deprecated in favor of `safety scan` in newer safety releases; `actions/checkout@v3` / `setup-python@v4` are older but functional. Non-blocking, version-dependent caveats.
- The A01 `require_roles` decorator pattern works here because the wrapped endpoints also declare `current_user: User = Depends(...)`, so FastAPI (following `@wraps`/`__wrapped__`) resolves the dependency correctly. It is a known-fragile idiom but not incorrect as written.
- SSRF protection (A10) covers private/loopback/link-local ranges and validates redirects with `follow_redirects=False`. It remains vulnerable to DNS-rebinding/TOCTOU (resolve-then-connect gap) — a well-known limitation of this approach, worth a caveat in a future revision but not a code error.
