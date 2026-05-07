# Validation Summary: How to Authenticate with the Portainer API Using JWT Tokens

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
- Python
- Python `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer authentication settings: https://docs.portainer.io/admin/settings/authentication
- Requests developer interface: https://requests.readthedocs.io/en/latest/api/
- RFC 7519, JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519.html
- Local CLI help: `curl --help all`
- Local CLI help: `jq --help`
- Local CLI help: `base64 --help`

## Issues Found
- The introduction said Portainer's API "uses JWT" for authentication, which implied JWT was the only or primary API authentication mechanism. I changed this to say Portainer's API supports JWT authentication through `/api/auth`, which matches Portainer's current documentation while keeping the post focused on the JWT flow.
- The token expiry section stated that JWT tokens expire after 8 hours by default without noting that Portainer administrators can change session lifetime. I updated the wording to keep the documented 8-hour default while clarifying that the effective expiry can vary with configuration.
- The JWT payload inspection command used `base64 -d` directly on the middle JWT segment. JWT payloads are base64url-encoded, so that command is not reliable as written. I replaced it with a `jq`-based command that converts base64url to standard base64, applies padding, decodes the payload, and extracts `.exp`.
- The conclusion described JWT authentication as the primary method for automation scripts. Current Portainer documentation emphasizes access tokens for API access, so I changed the wording to say JWT is a supported method and that access tokens are preferred for long-lived integrations.

## Review Notes
- The `/api/auth` flow, `jwt` response field, `Authorization: Bearer <token>` header format, and `/api/endpoints` examples are consistent with Portainer's documented API usage examples.
- The Bash and Python examples are syntactically valid. The Python example uses the `requests` API correctly, although production code would usually also add timeouts and stronger certificate handling.
- Portainer's current general API docs emphasize access tokens in the `X-API-Key` header. This post remains technically valid because Portainer still documents the JWT login flow, but access tokens are the better choice for long-lived automation.
