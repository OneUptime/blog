# Validation Summary: How to Fix 'Broken Authentication' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- JavaScript
- Node.js
- Express and express-session
- connect-redis and ioredis
- JSON Web Tokens with jsonwebtoken
- TOTP multi-factor authentication with speakeasy
- QR code generation with qrcode
- Password strength and breach checks with zxcvbn and Have I Been Pwned Pwned Passwords
- Redis-backed rate limiting and token/session state
- OWASP authentication, session management, JWT, and credential stuffing guidance

## Sources Consulted
- OWASP Top 10 2021 A07: Identification and Authentication Failures: https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/
- OWASP Top 10 2025 A07: Authentication Failures: https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Credential Stuffing Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
- OWASP Web Security Testing Guide, Testing JSON Web Tokens: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
- Have I Been Pwned API documentation, Pwned Passwords range API: https://haveibeenpwned.com/api/v3
- MDN Set-Cookie documentation for cookie prefixes and attributes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- express-session official documentation: https://expressjs.com/en/resources/middleware/session/
- connect-redis official README: https://github.com/tj/connect-redis
- jsonwebtoken official README: https://github.com/auth0/node-jsonwebtoken
- speakeasy official README: https://github.com/speakeasyjs/speakeasy
- qrcode official README: https://github.com/soldair/node-qrcode
- zxcvbn official README: https://github.com/dropbox/zxcvbn

## Issues Found
- The introduction referred to "Broken Authentication" as the current OWASP Top 10 category name. Updated it to "Authentication failures" and noted that "broken authentication" was the former category name, matching OWASP 2021 and 2025 terminology.
- The password validator and checklist required only 12 characters. Updated the default and checklist to 15 characters when MFA is not enabled, matching current OWASP Authentication Cheat Sheet guidance.
- The secure session example imported `connect-redis` using the older default export style. Updated it to use the current named `RedisStore` export.
- The `__Host-session` cookie example set a `Domain` attribute. Removed the `domain` option because `__Host-` cookies must be Secure, have `Path=/`, and must not include a Domain attribute.
- The session anomaly check overwrote `req.session.ip` before comparing it to the current request IP, so it could not detect a changed IP. Moved anomaly detection before metadata update.
- The `req.login` wrapper did not handle Passport's optional `options` argument shape. Added handling for `req.login(user, callback)` so callback invocation remains valid.

## Review Notes
- The code examples are illustrative and omit surrounding application setup such as mounting middleware, creating users, storing MFA secrets and backup codes securely, and configuring proxy trust for secure cookies behind TLS-terminating proxies.
- IP-change detection can create false positives for mobile users, VPN users, and users behind changing NATs. Treat it as a risk signal unless the application context justifies invalidating sessions.
- JWT revocation with Redis is technically valid, but production systems should align Redis TTLs with actual token expiry and avoid returning raw verification error details to clients.
