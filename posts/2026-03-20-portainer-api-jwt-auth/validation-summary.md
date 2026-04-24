# Validation Summary: How to Authenticate with the Portainer API Using JWT Tokens - Auth

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- JWT authentication
- Bash
- `curl`
- `jq`
- Python `requests`
- Node.js with `axios`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer environment API example showing JWT auth and 8-hour validity: https://docs.portainer.io/admin/environments/add/api
- Portainer authentication settings documentation: https://docs.portainer.io/admin/settings/authentication
- Portainer API access token documentation: https://docs.portainer.io/api/access
- Portainer official source for `/api/auth`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer official source for JWT claims and expiry handling: https://github.com/portainer/portainer/blob/develop/api/jwt/jwt.go
- Portainer official source for user roles: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer official source for `/api/users` access restrictions: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_list.go
- Portainer official source for `/api/system/status`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go
- Portainer official source for `/api/system/version`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/version.go
- Portainer official source for `/api/users/me`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_inspect_me.go
- RFC 7519 JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519
- RFC 7515 JSON Web Signature (JWS): https://www.rfc-editor.org/rfc/rfc7515

## Issues Found
- The introduction overstated JWT as Portainer's primary and universal API authentication method. I corrected this to describe JWT as a supported `/api/auth` flow, because current Portainer docs also recommend API access tokens for API automation.
- The Step 1 shell comment incorrectly called the login flow "Basic authentication". I changed it to username/password authentication because the example uses a JSON POST to `/api/auth`, not HTTP Basic Auth.
- The JWT decoding examples said JWT parts were base64-encoded and used `base64 -d` directly. I corrected the text to base64url encoding and updated the shell snippets to convert base64url input safely before decoding, per RFC 7515 and RFC 7519.
- The Step 2 `GET /api/users` example was too broad for a guide that says regular user credentials are valid prerequisites. Portainer restricts that endpoint, so I replaced it with `GET /api/users/me`, which is an authenticated endpoint that works for the current user.
- The Step 2 `GET /api/system/status` example did not actually require authentication, which weakened the JWT-header demonstration. I replaced it with `GET /api/system/version`, which is an authenticated API call.
- The token-expiry wording referred to "token expiry" in admin settings. Portainer exposes this setting as session lifetime, so I updated the language accordingly.
- The reusable Bash helper wrote a cached token file in `/tmp` without tightening file permissions and used plain base64 decoding. I added `umask 077`, made the JWT parsing base64url-safe, and tightened shell quoting so the example matches the security guidance in the post.
- The conclusion said JWT authentication is the standard way to interact with the API. I corrected that to "a supported way" and clarified that API access tokens are sent with `X-API-Key` and are better suited to automation.

## Review Notes
- Portainer's current top-level API docs emphasize API access tokens for automation, but the `/api/auth` JWT flow is still documented and supported.
- Portainer's current source shows JWTs include `id`, `username`, `role`, `iat`, and `exp`, with additional claims such as `scope` also present internally.
