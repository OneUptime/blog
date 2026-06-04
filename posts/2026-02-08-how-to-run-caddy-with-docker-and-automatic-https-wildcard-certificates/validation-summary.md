# Validation Summary: How to Run Caddy with Docker and Automatic HTTPS (Wildcard Certificates)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy 2
- Docker
- Docker Compose
- TLS / HTTPS
- ACME
- Let's Encrypt
- DNS-01 challenges
- Cloudflare DNS
- AWS Route53
- DigitalOcean DNS
- Google Cloud DNS
- Reverse proxying

## Sources Consulted
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy `tls` directive documentation: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy Docker Official Image documentation: https://hub.docker.com/_/caddy
- `caddy-dns/cloudflare` README: https://github.com/caddy-dns/cloudflare
- `caddy-dns/route53` package documentation: https://pkg.go.dev/github.com/caddy-dns/route53
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/

## Issues Found
- Caddy certificate issuance timing was described as happening when a domain is first requested. Caddy's normal automatic HTTPS obtains certificates for configured hostnames when configuration is loaded; first-handshake issuance is a separate On-Demand TLS feature. Updated the wording in both affected places.
- Docker Compose examples used the top-level `version: "3.8"` field. Docker's current Compose Specification keeps this field only for backward compatibility and warns that it is obsolete. Removed the `version` field from all Compose examples.
- The wildcard Caddyfile proxied the apex domain to `web-service:3000`, but the matching Compose example did not define `web-service`. Added a `web-service` backend to make the example internally consistent.
- Cloudflare API token permissions were incomplete. The current `caddy-dns/cloudflare` documentation recommends a single token with `Zone:Zone:Read` and `Zone:DNS:Edit` permissions. Updated the Compose comment and troubleshooting note.

## Review Notes
- The Caddy Docker documentation warns that mounting a single Caddyfile directly at `/etc/caddy/Caddyfile` can interfere with graceful reload behavior when editors replace the file inode. The examples still work for container startup, but mounting a config directory is preferable for reload-heavy workflows.
- The Route53 Caddyfile syntax remains valid; the provider documentation notes that `region` rarely needs to be changed outside GovCloud and China regions.
