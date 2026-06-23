# Validation Summary: How to Implement Authentication in Python APIs

## Status
validated

## Post Type
Tutorial / Guide (production-oriented implementation walkthrough)

## Technologies Covered
- Python 3.10+ (uses `list[str]` / built-in generic syntax)
- FastAPI (routes, dependencies, `OAuth2PasswordBearer`, `APIKeyHeader`, `Depends`/`Security`)
- PyJWT (`import jwt`) for JWT creation and validation
- pydantic-settings for configuration
- passlib + bcrypt for password hashing
- asyncpg / PostgreSQL for storage
- slowapi for rate limiting
- OAuth2 (Authorization Code flow, PKCE, client credentials, refresh token grant)
- API key authentication

## Sources Consulted
- PyJWT documentation — encoding/decoding, datetime handling of registered claims (`exp`, `iat`), `algorithms=` parameter (https://pyjwt.readthedocs.io/)
- NVD / GitHub Advisory — CVE-2025-61152, python-jose `alg=none` signature bypass through 3.3.0 (https://nvd.nist.gov/vuln/detail/CVE-2025-61152, https://github.com/advisories/GHSA-28pv-f4g7-364j)
- GitHub Advisory — CVE-2024-33663 python-jose algorithm confusion (https://github.com/advisories/GHSA-6c5p-j8vq-pqhj)
- RFC 7636 (PKCE) — `code_challenge = BASE64URL(SHA256(code_verifier))` for the S256 method
- RFC 6749 (OAuth2) — Authorization Code, Client Credentials, Refresh Token grants
- FastAPI security documentation — `OAuth2PasswordBearer`, `APIKeyHeader`, `OAuth2PasswordRequestForm` (https://fastapi.tiangolo.com/tutorial/security/)
- slowapi documentation — `Limiter`, `@limiter.limit`, requirement that decorated routes accept `request: Request` (https://slowapi.readthedocs.io/)
- asyncpg documentation — `execute()` returns the command status string (e.g. `"UPDATE 1"`, `"DELETE 5"`)

## Issues Found
1. **Missing `settings` import in `app/auth/oauth2.py`** — `exchange_code_for_tokens` returns `"expires_in": settings.access_token_expire_minutes * 60`, but the module's import block did not import `settings`, which would raise `NameError` at runtime. Added `from app.config import settings` to the module imports.
2. **Missing `timedelta` import in `app/auth/api_keys.py`** — `create_key` computes `datetime.now(timezone.utc) + timedelta(days=expires_in_days)`, but the module imported only `datetime` and `timezone` from `datetime`. Changed the import to `from datetime import datetime, timedelta, timezone` to prevent a `NameError`.

## Review Notes
- The note warning against python-jose and citing **CVE-2025-61152** is accurate: that CVE (python-jose `alg=none` signature bypass through 3.3.0, disclosed Oct 2025) is real, and the post correctly recommends PyJWT instead.
- PyJWT correctly accepts `datetime` objects for `exp`/`iat` (it serializes them to integer timestamps), and `decode()` correctly passes `algorithms=[self.algorithm]`, avoiding the algorithm-confusion class of bugs.
- The PKCE S256 verification matches RFC 7636 (`BASE64URL(SHA256(verifier))` compared against the stored challenge). There is one harmless dead line (`verifier_hash = hashlib.sha256(...).hexdigest()`) that is computed but never used — not incorrect, just unnecessary.
- `Settings` uses the legacy inner `class Config` style. This still works under pydantic-settings v2 but is deprecated in favor of `model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")`. Not changed, since it remains functional.
- Constructing `APIKey(**dict(row))` relies on Pydantic coercing the `UUID` `id` column from asyncpg into the model's `str` field; in strict configurations this may need an explicit `str(...)`. Left as-is since it is illustrative and Pydantic's default config coerces it.
- passlib 1.7.4 with bcrypt 4.x can emit a `(trapped) error reading bcrypt version` warning at import time; hashing/verification still function. Worth being aware of but not a correctness error.
