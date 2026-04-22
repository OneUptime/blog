# Validation Summary: How to Set a Custom Logo in Portainer - Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer Community Edition
- Portainer Business Edition
- Portainer HTTP API
- Docker Compose
- Nginx
- curl
- Python JSON parsing

## Sources Consulted
- Portainer Settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer CLI configuration documentation: https://docs.portainer.io/advanced/cli
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer BE 2.39.1 OpenAPI documentation: https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer 2.39.1 settings update handler source: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/settings/settings_update.go
- Docker Compose top-level version documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The UI navigation incorrectly directed readers to **Authentication** or **Branding**. Current Portainer documentation places the logo setting under **Settings > General** as **Use custom logo**, so the steps were updated.
- The UI action said to click **Save**. Current Portainer documentation uses **Apply Changes** for the Settings page, so the instruction was updated.
- The post stated that custom branding requires Portainer Business Edition. Current Portainer documentation includes custom logo support for both Community Edition and Business Edition, so the wording and prerequisites were updated.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Docker Compose now treats this field as informational and warns that it is obsolete, so it was removed.
- The hosted logo example told readers to use `http://logo-server:8080/logo.png`. That Compose service name is only resolvable inside the Docker network, while the logo image is loaded by users' browsers. The URL was changed to use the host IP or DNS name.
- The hosting prerequisites over-specified a public URL. Since the UI renders the image in the browser, the requirement was clarified to a URL reachable by users' browsers.

## Review Notes
The API examples using `/api/auth`, bearer JWT authentication, `PUT /api/settings`, and the `LogoURL` field were checked against the current OpenAPI schema and Portainer source. The official API access documentation recommends API access tokens with the `X-API-Key` header for automation, but the documented JWT flow remains supported by the API schema.
