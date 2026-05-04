# Validation Summary: How to Configure Portainer Base URL for Subpath Deployments

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Portainer CE (Community Edition)
- Docker / Docker Compose
- Nginx (reverse proxy)
- Traefik (reverse proxy)
- TLS / HTTPS

## Sources Consulted
- [Portainer CLI configuration options](https://docs.portainer.io/advanced/cli)
- [Portainer reverse proxy documentation](https://docs.portainer.io/advanced/reverse-proxy)
- [Portainer reverse proxy nginx documentation](https://docs.portainer.io/advanced/reverse-proxy/nginx)
- [portainer-docs (GitHub) - 2.33 advanced/cli.md](https://github.com/portainer/portainer-docs/blob/2.33/advanced/cli.md)
- [linuxserver/reverse-proxy-confs - portainer subfolder sample](https://github.com/linuxserver/reverse-proxy-confs/blob/master/portainer.subfolder.conf.sample)
- [Traefik community forum: proxy Portainer under sub path](https://community.traefik.io/t/proxy-portainer-under-sub-path/3601)

## Issues Found

1. **Nginx `proxy_pass` did not strip the `/portainer/` prefix.**
   - Original: `proxy_pass https://localhost:9443/portainer/;`
   - Fixed to: `proxy_pass https://localhost:9443/;`
   - **Why:** The official Portainer CLI docs state that when using `--base-url`, "your reverse proxy configuration will strip the specified subpath." Passing `/portainer/` through to the backend means Portainer (which expects the prefix to be stripped before reaching the application) would receive doubled/incorrect paths and serve assets / API calls incorrectly. Adding a trailing-slash proxy_pass to a path-less upstream URI is the canonical Nginx idiom for stripping the matched location prefix. Added a short comment explaining the trailing slash so future readers understand the prefix-stripping behavior.

## Review Notes

- The Traefik configuration is correct: the `stripPrefix` middleware removes `/portainer` before forwarding to the Portainer service, matching the official guidance.
- The `--base-url` flag is the correct, current Portainer CE flag for subpath deployments (verified against Portainer 2.x docs, including the 2.33 and 2.40 STS branches).
- The post does not mention the `--trusted-origins` flag. This flag is not strictly required, but the Portainer docs recommend setting it (to the bare domain, e.g., `example.com`) when running behind a reverse proxy to avoid "Origin invalid" errors on POST requests. A future revision could mention this in the "Common Issues" section.
- The Docker Compose example uses `command: --base-url /portainer`, which is valid — Docker Compose passes the `command` value as arguments to the container's entrypoint, so the flag reaches the Portainer binary correctly.
- The `curl` verification commands are syntactically valid; `-k` is appropriate when testing self-signed certs commonly used with Portainer's built-in HTTPS on 9443.
- Minor: ports `8000` and `9443` are correct defaults for Portainer CE 2.x (8000 for the Edge agent tunnel, 9443 for HTTPS UI). The default HTTP port (9000) is intentionally not exposed in the example, which is reasonable since the HTTPS port is being proxied.
