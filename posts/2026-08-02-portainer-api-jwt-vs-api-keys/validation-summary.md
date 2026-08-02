# Validation Summary: Portainer API Authentication: JWT Tokens vs. API Keys for Scripts and CI

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Portainer HTTP API
- JSON Web Tokens (JWT)
- Portainer API access tokens
- Bash
- curl
- jq
- GitHub Actions
- HTTPS and TLS certificate verification

## Sources Consulted
- [Portainer: Accessing the Portainer API](https://docs.portainer.io/api/access)
- [Portainer: API usage examples](https://docs.portainer.io/api/examples)
- [Portainer: Current API documentation](https://docs.portainer.io/api/docs)
- [Portainer CE 2.39.5 LTS OpenAPI documentation](https://api-docs.portainer.io/?edition=ce&version=2.39.5)
- [Portainer CE 2.44.0 STS OpenAPI documentation](https://api-docs.portainer.io/?edition=ce&version=2.44.0)
- [Portainer: Account settings and access tokens](https://docs.portainer.io/user/account-settings)
- [Portainer: Requirements, prerequisites, and network ports](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Portainer 2.44.0 authentication handler source](https://github.com/portainer/portainer/blob/2.44.0/api/http/handler/auth/authenticate.go)
- [Portainer 2.44.0 JWT service source](https://github.com/portainer/portainer/blob/2.44.0/api/jwt/jwt.go)
- [Portainer 2.44.0 API authentication middleware source](https://github.com/portainer/portainer/blob/2.44.0/api/http/security/bouncer.go)
- [Portainer 2.44.0 API-key service source](https://github.com/portainer/portainer/blob/2.44.0/api/apikey/service.go)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [curl: SSL certificate verification](https://curl.se/docs/sslcerts.html)
- [jq manual](https://jqlang.org/manual/)
- [GNU Bash reference manual](https://www.gnu.org/software/bash/manual/bash.html)
- [GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions: Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [IETF RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)

## Issues Found
- The introduction implied that password authentication at `POST /api/auth` applies to every Portainer user. Portainer's current handler supports internal authentication and configured LDAP authentication there, while ordinary OAuth users use the OAuth flow. The introduction and comparison table now state that distinction.
- The post presented eight hours as an effectively fixed JWT lifetime. Eight hours is Portainer's documented default, but the server's user-session timeout is configurable. The lifetime discussion and recommendation now refer to the configured lifetime and renewal flow.
- The post described sending both authentication headers as ambiguous and potentially proxy-dependent. Current Portainer releases explicitly reject authenticated requests containing both `Authorization` and `X-API-Key`, so the common-mistake guidance now states that behavior directly.

## Review Notes
The Bash snippets passed `bash -n`, all documented curl flags were confirmed with curl 8.7.1, the jq expressions were checked against jq 1.6 and the current jq manual, and the GitHub Actions YAML fragment parsed successfully. `--fail-with-body` is a current curl option introduced in curl 7.76.0, so unusually old runner images would need a curl upgrade or a compatible alternative. Portainer endpoint availability and schemas remain release-specific, as the post already notes.
