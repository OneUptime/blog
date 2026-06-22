# Validation Summary: How to Implement OAuth Token Caching with Redis

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Redis
- OAuth 2.0
- Python
- redis-py
- cryptography/Fernet
- Node.js
- ioredis
- Node.js crypto
- Axios
- Google OAuth endpoints
- GitHub OAuth/GitHub App token endpoints

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- redis-py documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://github.com/redis/ioredis
- Python cryptography Fernet documentation: https://cryptography.io/en/latest/fernet/
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- OAuth 2.0 Framework, RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- OAuth 2.0 Token Revocation, RFC 7009: https://datatracker.ietf.org/doc/html/rfc7009
- Google OAuth 2.0 documentation: https://developers.google.com/identity/protocols/oauth2
- Google OAuth 2.0 web server flow documentation: https://developers.google.com/identity/protocols/oauth2/web-server
- GitHub refreshing user access tokens documentation: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens
- GitHub OAuth application token API documentation: https://docs.github.com/v3/apps/oauth_applications

## Issues Found
- The Python Fernet example used a placeholder byte string that is not a valid Fernet key. Updated it to read a Fernet-generated key from an environment variable, matching Fernet's requirement for a URL-safe base64-encoded 32-byte key.
- The examples used Redis `SETEX`, which Redis documents as deprecated in favor of `SET` with the `EX` option. Updated Python and Node.js examples to use `SET ... EX` through the respective clients.
- The refresh logic overwrote stored refresh tokens when a provider returned a refresh response without a new `refresh_token`. Updated Python and Node.js refresh paths to preserve the existing refresh token unless the provider rotates and returns a replacement.
- The Node.js encryption sample used AES-CBC without authentication. Updated it to AES-256-GCM with an authentication tag using Node's documented `getAuthTag()` and `setAuthTag()` APIs.
- The service account token cache stored access tokens as plaintext JSON despite the post's "Always encrypt tokens at rest" guidance. Updated it to encrypt cached service tokens with Fernet.
- The GitHub revocation sample contained an incomplete placeholder URL and did not perform GitHub revocation. Updated it to use GitHub's documented DELETE app token endpoint with Basic authentication and the access token in the request body.

## Review Notes
The fenced Python and JavaScript code blocks were checked for syntax after the fixes. Provider behavior can still vary by OAuth app type and provider configuration, especially for refresh token issuance and rotation, so production implementations should handle provider-specific error responses, token rotation policies, and reauthorization flows.
