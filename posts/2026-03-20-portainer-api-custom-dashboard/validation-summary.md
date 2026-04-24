# Validation Summary: How to Build a Custom Dashboard Using the Portainer API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer API
- Docker Engine API
- JavaScript
- HTML
- `curl`
- Python `http.server`
- `serve`
- nginx

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN CORS-safelisted request headers: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
- `python3 -m http.server --help`
- `curl --help all`
- `npx --yes serve --help`

## Issues Found
- The UI path for creating a long-lived Portainer token was outdated. The post said `Settings > My Account > API Keys > Add API Key`, but current Portainer documentation uses the user menu in the top-right, then `My account`, with tokens managed in the `Access tokens` section. I updated the instructions and terminology accordingly.
- The browser dashboard example hard-coded a long-lived Portainer token into client-side JavaScript. Portainer documents these as access tokens that should be kept safe and only shown at creation time, so embedding one directly in a static page was not a sound implementation. I changed the example to prompt for the access token at runtime instead of shipping it in source.
- The browser example assumed a static page served from a different origin could call the Portainer API directly with `X-API-Key`. Per MDN, a custom header like `X-API-Key` is not CORS-safelisted and cross-origin requests using it require the server to allow that header. I changed the example to use a same-origin `/api` base path and added a note that the dashboard should be served from the same origin as Portainer or behind a reverse proxy.
- The container summary counted only containers with `State === 'exited'` as stopped, which missed other non-running Docker states such as `paused`, `restarting`, and `dead`. Docker documents multiple non-running states, so I changed the metric and label to `Not Running`.
- The card renderer assumed `c.Names[0]` always existed. I added a fallback to the container ID to avoid a client-side error if the expected name array is absent.

## Review Notes
- Portainer renamed "Endpoints" to "Environments" in the UI, but the API path remains `/api/endpoints`, so the mixed terminology in the article is acceptable when describing the API route.
- I verified `python3 -m http.server`, `curl`, and `npx serve` syntax directly. Docker CLI was not installed in the local environment, so the `docker run` bind-mount example was checked against Docker’s official bind-mount documentation instead.
