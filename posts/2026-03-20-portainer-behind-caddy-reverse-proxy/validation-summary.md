# Validation Summary: How to Set Up Portainer Behind Caddy Reverse Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Caddy
- Docker Compose
- HTTPS / TLS
- Reverse proxies
- caddy-docker-proxy

## Sources Consulted
- Caddy reverse proxy directive docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy automatic HTTPS docs: https://caddyserver.com/docs/automatic-https
- Caddy command line docs: https://caddyserver.com/docs/command-line
- Caddy log directive docs: https://caddyserver.com/docs/caddyfile/directives/log
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer HTTPS / HTTP port behavior FAQ: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/client-sent-an-http-request-to-an-https-server
- Portainer SSL certificate docs: https://docs.portainer.io/advanced/ssl
- Portainer release notes for `--trusted-origins`: https://docs.portainer.io/sts/release-notes
- Portainer maintainer guidance on `--trusted-origins`: https://github.com/portainer/portainer/issues/12748
- caddy-docker-proxy README: https://github.com/lucaslorentz/caddy-docker-proxy

## Issues Found
- The Caddyfile used `header_up` directives at the site-block level. In Caddy, `header_up` is a `reverse_proxy` subdirective, so the example as written was not valid Caddyfile syntax. I removed those lines.
- The post implied those forwarded headers had to be set manually for Portainer. Caddy already sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` by default, so the removed lines were also unnecessary.
- The comment above `tls_insecure_skip_verify` said it would "trust" Portainer's self-signed certificate. That is inaccurate. The directive skips TLS verification rather than establishing trust, so I corrected the wording.
- The Compose example used the top-level `version: "3.8"` field. Current Docker Compose treats `version` as obsolete, so I removed it to match the current Compose Specification.
- The Portainer example used `--trusted-origins=https://portainer.example.com`. Portainer documents this setting as trusted domain names, and maintainer guidance shows the value should be the domain, not a full URL. I corrected it to `--trusted-origins=portainer.example.com`.
- The validation section used `caddy list-modules` as a certificate-status check. That command only lists installed modules, so I replaced it with `caddy validate --config ... --adapter caddyfile`, which actually validates the Caddyfile.
- The reload example omitted the Caddyfile adapter even though the config path is `/etc/caddy/Caddyfile`. I added `--adapter caddyfile` to make the command explicit and correct.
- The post told readers to view "Caddy access logs" with `docker logs caddy 2>&1 | grep portainer`, but Caddy access logs are not enabled by default. I changed this to viewing Caddy runtime logs instead.
- The Docker labels section implied labels alone were enough while the earlier Compose file used the standard `caddy:2-alpine` image. I clarified that this approach requires a `caddy-docker-proxy` image rather than the plain Caddy image.
- The troubleshooting section said Caddy uses HTTP-01 on port 80 first. Current Caddy docs say HTTP-01 and TLS-ALPN-01 are both enabled by default and challenge selection is not fixed in that way, so I corrected the wording.
- The troubleshooting section also said seeing `acme-staging` means Caddy hit rate limits. Caddy may switch to Let's Encrypt staging during retries, but that is not equivalent to a confirmed rate-limit condition. I corrected the explanation to point readers at the ACME error logs.

## Review Notes
- The tutorial is technically valid after the corrections above.
- The post still uses floating image tags (`caddy:2-alpine` and `portainer/portainer-ce:latest`). That works, but pinning explicit versions or release streams would make the tutorial more reproducible.
- Using `tls_insecure_skip_verify` for the upstream Portainer connection is functional, but Caddy's docs explicitly warn that disabling upstream certificate verification is not recommended for production. The post already offers the simpler HTTP-on-9000 alternative when `--http-enabled` is used.
