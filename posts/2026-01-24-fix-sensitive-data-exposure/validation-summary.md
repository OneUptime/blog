# Validation Summary: How to Fix 'Sensitive Data Exposure' Issues

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- OWASP Top 10 and API Security guidance
- Python cryptography Fernet and PBKDF2HMAC
- Python logging filters and regular expressions
- Node.js bcrypt password hashing
- Express response middleware
- Nginx TLS, HTTP/2, OCSP stapling, and HSTS configuration

## Sources Consulted
- OWASP Top 10 project: https://owasp.org/www-project-top-ten/
- OWASP Top 10:2021 A02 Cryptographic Failures: https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Transport Layer Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP API Security Top 10 2023 API3: https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
- cryptography Fernet documentation: https://cryptography.io/en/latest/fernet/
- bcrypt for Node.js documentation: https://github.com/kelektiv/node.bcrypt.js/
- Express 5.x API and middleware documentation: https://expressjs.com/en/api/ and https://expressjs.com/en/guide/using-middleware/
- Python logging documentation: https://docs.python.org/3/library/logging.html
- Nginx SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NIST SP 800-63B Digital Identity Guidelines: https://pages.nist.gov/800-63-3/sp800-63b.html

## Issues Found
- The post described sensitive data exposure as consistently ranked in the OWASP Top 10. OWASP currently frames this risk as Cryptographic Failures, previously known as Sensitive Data Exposure, so the wording was updated to match current OWASP terminology.
- The bcrypt example claimed bcrypt performs a constant-time comparison internally. The bcrypt API hashes the supplied password and compares bcrypt digests; the comment was changed to avoid overstating a constant-time guarantee.
- The logging email redaction regex used `[A-Z|a-z]`, which also allowed a literal pipe character in the top-level domain character class. It was corrected to `[A-Za-z]`.
- The JWT logging example used a truncated token with ellipses that would not match the provided JWT regex. The example token was changed to a three-part base64url-like value that the regex masks.
- The Nginx TLS example used `listen 443 ssl http2;`, which is deprecated in newer Nginx releases. It was updated to `listen 443 ssl;` with `http2 on;`.
- The Nginx OCSP stapling example omitted a `resolver`, which Nginx documents as needed to resolve OCSP responder hostnames. A resolver and resolver timeout were added.

## Review Notes
- The Python and JavaScript code blocks were syntax-checked after edits. Both Python blocks parse successfully, and both JavaScript blocks pass `node --check`.
- The password policy example is functional, but future revisions could align user-facing password rules more closely with NIST SP 800-63B by emphasizing length, breached-password screening, and password managers over composition requirements.
- The Fernet example correctly notes that the salt must be stored securely; in a production implementation, make the salt storage and key rotation strategy explicit.
