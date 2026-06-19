# Validation Summary: How to Implement OWASP Security Guidelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OWASP ASVS 4.0.3
- OWASP Cheat Sheet Series
- Express.js
- express-session
- connect-redis
- node-redis
- Helmet
- Casbin
- Speakeasy TOTP
- Have I Been Pwned Pwned Passwords API
- Node.js crypto
- YAML configuration

## Sources Consulted
- OWASP ASVS project page: https://owasp.org/www-project-application-security-verification-standard/
- OWASP ASVS 4.0.3 Authentication requirements: https://github.com/OWASP/ASVS/blob/master/4.0/en/0x11-V2-Authentication.md
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Content Security Policy Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- Helmet documentation and npm README: https://www.npmjs.com/package/helmet
- express-session documentation: https://expressjs.com/en/resources/middleware/session/
- connect-redis npm README: https://www.npmjs.com/package/connect-redis
- express-rate-limit npm README: https://www.npmjs.com/package/express-rate-limit
- express-validator npm README: https://www.npmjs.com/package/express-validator
- DOMPurify documentation: https://github.com/cure53/DOMPurify
- Have I Been Pwned API documentation: https://haveibeenpwned.com/api/v3
- Apache Casbin documentation: https://casbin.org/docs/get-started/
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- MDN X-XSS-Protection reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The post used ASVS 4.0.3-style requirement IDs without identifying the ASVS version. OWASP notes that unversioned IDs should be treated as the latest ASVS content, and ASVS 5.0.0 is now the latest stable version. I added a sentence clarifying that the examples use ASVS 4.0.3 IDs.
- The password policy required uppercase, lowercase, number, and special characters. ASVS 4.0.3 V2.1.9 and OWASP's Authentication Cheat Sheet recommend no password composition rules and allowing printable Unicode and whitespace. I removed the composition checks and updated the comments.
- The password length check used JavaScript string length directly and did not reflect ASVS wording about combining multiple spaces. I changed it to count Unicode code points after coalescing consecutive spaces.
- The express-rate-limit snippet used the older default-style CommonJS import and `max` option. Current express-rate-limit documentation shows the named `rateLimit` export, `limit`, draft-specific `standardHeaders`, and `legacyHeaders: false`. I updated the snippet.
- The connect-redis snippet used the older CommonJS default export pattern and ioredis. connect-redis 9.0.0 documents a named `RedisStore` export and the `redis` client. I updated the snippet to use `const { RedisStore } = require('connect-redis')` and `createClient` from `redis`.
- The session configuration commented `rolling: true` as session regeneration on authentication. `rolling` refreshes cookie expiry on active sessions; regeneration is performed by `req.session.regenerate()`. I corrected the comment.
- The Helmet snippet used older alias option names such as `hsts`, `frameguard`, `noSniff`, `ieNoOpen`, `permittedCrossDomainPolicies`, and `xssFilter`. Helmet 8 documents current option names such as `strictTransportSecurity`, `xFrameOptions`, `xContentTypeOptions`, `xDownloadOptions`, `xPermittedCrossDomainPolicies`, and `xXssProtection`. I updated the snippet.
- The CSP example used `'strict-dynamic'` without a nonce or hash. OWASP CSP guidance describes `strict-dynamic` as being used with nonces or hashes, so I removed it from the simple policy.
- The Helmet comment described the legacy XSS filter as enabled protection. Current Helmet sets `X-XSS-Protection: 0`, disabling the legacy filter, and MDN recommends CSP instead. I corrected the comment.

## Review Notes
The code snippets remain illustrative and assume surrounding Express application setup such as `app`, `authenticate`, `User`, and `getUserRoles`. Future maintenance should consider migrating the whole article to ASVS 5.0.0 requirement IDs rather than keeping ASVS 4.0.3 references.
