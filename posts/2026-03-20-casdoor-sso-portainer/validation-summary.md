# Validation Summary: How to Configure Casdoor SSO with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Casdoor
- OAuth 2.0
- OpenID Connect (OIDC)
- Portainer HTTP API
- `curl`
- `python3`

## Sources Consulted
- Portainer OAuth configuration docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer 2.39.1 API schema: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source for OAuth resource handling: https://raw.githubusercontent.com/portainer/portainer/develop/api/oauth/oauth.go
- Portainer source for username extraction: https://raw.githubusercontent.com/portainer/portainer/develop/api/oauth/oauth_resource.go
- Portainer source for settings update payload: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/settings/settings_update.go
- Casdoor OIDC discovery docs: https://casdoor.org/docs/how-to-connect/oidc-client/
- Casdoor OAuth docs: https://casdoor.org/docs/how-to-connect/oauth
- Casdoor application configuration docs: https://casdoor.ai/docs/application/config/
- Casdoor application terminology docs: https://casdoor.ai/docs/application/terminology/
- Casdoor consent flow docs: https://casdoor.org/docs/how-to-connect/oauth-consent
- Casdoor source for `/api/get-account` and `/api/userinfo`: https://raw.githubusercontent.com/casdoor/casdoor/master/controllers/account.go
- Casdoor source for OIDC userinfo claim mapping: https://raw.githubusercontent.com/casdoor/casdoor/master/object/user.go

## Issues Found
- The post used Casdoor `/api/get-account` as Portainer’s `ResourceURI`. Portainer expects the configured `UserIdentifier` to exist at the top level of the resource response, but Casdoor `/api/get-account` wraps the user object under `data`. I changed the resource endpoint to `/api/userinfo`, which is Casdoor’s OIDC userinfo endpoint and matches the discovery output shown earlier in the post.
- The post used `UserIdentifier: name`. In Casdoor’s OIDC userinfo response, `preferred_username` is the username field derived from the Casdoor user `Name`, while `name` is the display name. I changed `UserIdentifier` to `preferred_username` and updated the endpoint table and user-properties note to match.
- The redirect URI guidance was too loose. Casdoor documents redirect URI matching as exact by scheme, port, and path, and Portainer sends the configured `RedirectURI` value. I clarified that the Casdoor app must use the exact external Portainer URL and aligned the example with a `PORTAINER_URL` variable.
- The test flow assumed a consent screen always appears. Casdoor’s consent policy can show the prompt always, once, or never, so I changed the step to “If prompted, authorize the Portainer application.”

## Review Notes
- Portainer’s custom OAuth configuration does not consume OIDC discovery directly; the discovery step is still valid as a way to retrieve the correct Casdoor authorization, token, and userinfo endpoints before entering them into Portainer.
- The example uses Portainer’s generic custom OAuth settings and current Portainer 2.39.1 API field names as documented in the official OpenAPI schema.
