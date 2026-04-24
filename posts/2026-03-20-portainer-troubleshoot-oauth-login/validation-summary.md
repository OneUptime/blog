# Validation Summary: How to Troubleshoot OAuth Login Issues in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0
- OpenID Connect
- Docker
- `curl`
- Python 3

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer CE API schema 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer release notes: https://docs.portainer.io/release-notes
- OAuth 2.0 Authorization Framework (RFC 6749): https://www.rfc-editor.org/rfc/rfc6749.html
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html

## Issues Found
- The `/api/settings` inspection snippets used `oauthsettings`, but the Portainer API schema exposes `OAuthSettings`. I updated both code samples so they read the correct field and return real values.
- The `/api/auth` example used lowercase `username` and `password`. I aligned the payload with Portainer's documented `Username` and `Password` field names.
- The redirect URI fix implied a mandatory trailing slash. Portainer's docs describe the Redirect URL as the Portainer instance URL, so I changed the guidance to match the exact instance URL, including scheme, host, port, and any subpath.
- The `invalid_client` section said the client ID or secret was wrong. RFC 6749 defines `invalid_client` more broadly as failed client authentication, so I corrected the explanation and added the Portainer-specific `Auth Style` caveat.
- The reverse-proxy section described the error as Portainer CSRF protection rejecting the OAuth callback. Portainer's current docs describe this as an origin-validation issue addressed with `--trusted-origins`, so I corrected the explanation and the inspection command.
- The token-parsing section referred to ID token parsing and a hardcoded `/oauth/userinfo` endpoint. Portainer's docs say the user identifier is taken from the configured Resource URL, so I updated the section to use the Resource URL terminology and variable.
- The network-debugging section treated `/.well-known/openid-configuration` as generic OAuth behavior and assumed debugging tools existed inside the Portainer container. I qualified the discovery step as OpenID Connect-specific and switched the DNS example to an ephemeral container.
- The log-analysis section claimed `docker logs` enabled verbose logging. I corrected it to tail logs and pointed readers to Portainer's documented `--log-level DEBUG` setting for more detail.
- The manual authorization URL example did not URL-encode query parameters. I replaced it with a Python-based URL builder so `redirect_uri`, `scope`, and `state` are encoded correctly.

## Review Notes
- Portainer's current docs and release notes show `--trusted-origins` as a supported option, but the release notes indicate it was introduced in newer Portainer releases. Older deployments may need an upgrade before that flag is available.
- The post remains intentionally provider-agnostic, so placeholder IdP URLs are acceptable as long as readers substitute their provider's actual Authorization URL, Access token URL, and Resource URL.
