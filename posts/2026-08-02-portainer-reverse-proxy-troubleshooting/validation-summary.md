# Validation Summary: Portainer Behind Nginx, Traefik, or Cloudflare: Fixing Login, WebSocket, and HTTPS Problems

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Portainer Community Edition
- Nginx
- Traefik Proxy
- Cloudflare reverse proxy and SSL/TLS
- Docker Compose and Docker networking
- WebSockets
- HTTPS and upstream TLS
- curl

## Sources Consulted
- Portainer reverse-proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Nginx reverse-proxy guide: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer Traefik reverse-proxy guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer CLI configuration options (`--base-url`, `--trusted-origins`, and `TRUSTED_ORIGINS`): https://docs.portainer.io/advanced/cli
- Portainer 2.41.0 release notes and CSRF/trusted-origin compatibility change: https://github.com/portainer/portainer/releases/tag/2.41.0
- Portainer 2.39.5 trusted-origin validator source: https://github.com/portainer/portainer/blob/2.39.5/pkg/validate/validate.go
- Portainer 2.44.0 trusted-origin validator source: https://github.com/portainer/portainer/blob/2.44.0/pkg/validate/validate.go
- Portainer CE `lts` image-tag metadata: https://hub.docker.com/r/portainer/portainer-ce/tags?name=lts
- Portainer public `/system/status` endpoint implementation and API annotation: https://github.com/portainer/portainer/blob/2.39.5/api/http/handler/system/status.go
- Portainer console timeout troubleshooting: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer authentication-after-update troubleshooting: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer requirements and network ports: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Edge Agent architecture: https://docs.portainer.io/advanced/edge-agent
- Nginx WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Nginx reverse-proxy request, header, and URI replacement behavior: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- Traefik WebSocket guide: https://doc.traefik.io/traefik/user-guides/websocket/
- Traefik Docker and Swarm provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/ and https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker `run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- curl command-line reference: https://curl.se/docs/manpage.html
- Cloudflare WebSocket support and connection behavior: https://developers.cloudflare.com/network/websockets/
- Cloudflare supported proxy ports: https://developers.cloudflare.com/fundamentals/reference/network-ports/
- Cloudflare Flexible SSL/TLS mode and redirect-loop caveat: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/flexible/
- Cloudflare Full (strict) SSL/TLS mode: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Cloudflare errors 525 and 526: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-525/ and https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/

## Issues Found
- The two Compose examples used the moving `portainer/portainer-ce:lts` image but supplied `--trusted-origins=https://portainer.example.com/`. The current `lts` tag points to the 2.39 LTS stream, whose validator accepts a bare hostname and rejects values containing a scheme. I changed both examples to `--trusted-origins=portainer.example.com` so they work with the image stream shown.
- The trusted-origin explanation incorrectly treated one syntax as valid across current releases and included a trailing slash. Portainer 2.41 and later require an HTTP or HTTPS origin with a scheme and optional port, while their validator rejects any path; a trailing slash parses as a path. I documented the 2.39/2.41 compatibility boundary and corrected the later-release example to `https://portainer.example.com`.
- The Docker connectivity test was described as running in the proxy container's network namespace, but `docker run --network proxy` starts a separate container attached to the same Docker network. I corrected the description and clarified that `proxy` must be replaced when the deployment uses a different network name.
- I added the official Portainer 2.41.0 release-notes link to support the version-specific trusted-origin guidance.

## Review Notes
- Both YAML examples passed YAML parsing and `docker compose config` using Docker Compose v5.1.4.
- Both Nginx fragments passed `nginx -t` with the current `nginx:alpine` image after wrapping the excerpts in their required contexts and substituting test-only local upstream and certificate handling. The published directives and URI-rewrite behavior were unchanged.
- The Nginx WebSocket headers, HTTP/1.1 setting, and extended `proxy_read_timeout` match Nginx and Portainer guidance. Traefik handles WebSocket upgrades through standard HTTP routing without special WebSocket labels.
- The Cloudflare advice is current: Full (strict) validates the origin certificate, 9443 and 8000 are not among the default proxied HTTP/HTTPS ports, WebSockets are supported when enabled, and errors 525/526 concern the Cloudflare-to-origin TLS connection.
- Portainer's `lts` tag is a moving stream. The trusted-origin syntax should be checked again when that tag advances beyond the 2.39 LTS line.
