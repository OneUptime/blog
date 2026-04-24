# Validation Summary: How to Fix 'Origin Invalid' Errors in Portainer Behind a Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Docker Swarm
- Reverse proxies
- Nginx
- Traefik
- Apache HTTP Server
- CSRF protection

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer release notes: https://docs.portainer.io/release-notes?fallback=true
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Traefik reverse proxy guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer source, CLI flag parsing: https://raw.githubusercontent.com/portainer/portainer/2.40.0/api/cli/cli.go
- Portainer source, trusted-origin validation: https://raw.githubusercontent.com/portainer/portainer/2.40.0/pkg/validate/validate.go
- Portainer source, proxy scheme handling: https://raw.githubusercontent.com/portainer/portainer/2.40.0/api/http/middlewares/plaintext_http_request.go
- Portainer source, CSRF middleware: https://raw.githubusercontent.com/portainer/portainer/2.40.0/api/http/csrf/csrf.go
- Portainer maintainer issue on affected versions and workaround: https://github.com/portainer/portainer/issues/12748
- gorilla/csrf documentation: https://pkg.go.dev/github.com/gorilla/csrf
- gorilla/csrf source: https://raw.githubusercontent.com/gorilla/csrf/v1.7.3/csrf.go
- gorilla/csrf options source: https://raw.githubusercontent.com/gorilla/csrf/v1.7.3/options.go

## Issues Found
- The post used full URLs such as `https://portainer.example.com` for `--trusted-origins`. I changed these to bare hostnames such as `portainer.example.com` because current Portainer validates trusted origins as host-only values and rejects scheme, path, and port components.
- The post omitted the version context for `--trusted-origins`. I added the minimum supported Portainer versions for this option: 2.27.9 LTS and 2.31.3 STS.
- The subpath section said the browser origin could mismatch because of the path. I corrected this because URL paths are not part of the browser origin; `--base-url` is needed for subpath routing, not because the origin includes `/portainer`.
- The wildcard example `--trusted-origins='*'` was incorrect. I replaced it because current Portainer uses an explicit hostname allowlist and does not implement wildcard trust-all behavior there.
- The proxy-header section referenced `X-Forwarded-Host` and a Traefik verification command that were not supported by Portainer's current origin-checking code path. I reduced this to the header Portainer actually checks for this case: `X-Forwarded-Proto`.

## Review Notes
Portainer's current released tags still use `gorilla/csrf` for this path, while the upstream development branch has already moved toward Go's newer cross-origin protection APIs. This post is now accurate for current released behavior, but it is version-sensitive and may need another review if Portainer changes the trusted-origin format in a future release.
