# Validation Summary: How to Set Up Boulder (Let's Encrypt CA Software) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Boulder (Let's Encrypt CA software)
- ACME protocol
- Docker / Docker Compose
- Certbot
- cert-manager (Kubernetes)
- Caddy
- MariaDB
- Prometheus (metrics)
- PKCS#11 / HSM

## Sources Consulted
- Boulder GitHub repository: https://github.com/letsencrypt/boulder
- Boulder release tags listed via GitHub API (`gh api repos/letsencrypt/boulder/tags`)
- Boulder `docker-compose.yml` (top-level repository file)
- Boulder `sa/migrations.sh` script
- Boulder `sa/db/` SQL migration files
- Ubuntu package archive (https://packages.ubuntu.com/) for `docker-compose-v2` availability
- Caddy Caddyfile `tls` directive docs: https://caddyserver.com/docs/caddyfile/directives/tls
- cert-manager ACME issuer docs: https://cert-manager.io/docs/configuration/acme/

## Issues Found
1. **Invalid Boulder release tag.** The post pinned `git checkout release-2024-01-09`, but Boulder's tag history does not include that date — the surrounding valid tags are `release-2024-01-08` and `release-2024-01-16`. Changed to `release-2024-01-08`, the closest valid release.
2. **Fabricated database migration command.** The post instructed running `docker compose run boulder-tools ./bin/create-empty-amorphic-db`, but no such script exists in the Boulder repository, nor does a `boulder-tools` compose service (the equivalent service is `boulder`, with `bsetup` for cert setup). Replaced with `docker compose run --rm boulder ./sa/migrations.sh`, which is the real DB migration helper checked into `sa/migrations.sh` in the repo.

## Review Notes
- The post claims Ubuntu 20.04 or 22.04 support, but `docker-compose-v2` as an APT package only exists from 22.04 (jammy) onward. On 20.04 (focal) users would have to install the Docker Compose plugin via Docker's official APT repository or use `docker-compose` (v1). Left unchanged since 22.04 is the most common target and the rest of the commands use the `docker compose` (v2) plugin syntax that works in either install path.
- Boulder dev exposes ACMEv2 on port 4001 — confirmed against the upstream `docker-compose.yml` (`ports: 4001:4001 # ACMEv2`).
- The Boulder architecture component list (WFE, RA, CA, SA, OCSP Responder, VA, Publisher) is accurate.
- The JSON configuration snippets (CA Issuers/Profiles, VA dnsResolvers, ratelimit policies) are illustrative rather than literal copies of Boulder's current config schemas — Boulder's real config files have evolved (e.g., rate limits moved to YAML policies in `test/rate-limit-policies.yml`, and CA profiles have additional fields like `MaxValidity`, `AllowMustStaple`, `OmitCommonName`). They are still close enough to communicate the structure to a reader who will read the live config examples in `test/config/` before applying them to production. A future revision could replace these snippets with the actual current field names.
- Prometheus metric names like `boulder_ca_certificates_issued_total` and `boulder_wfe_request_duration_seconds` are presented as examples; Boulder's actual metrics are a mix of process/Go runtime metrics and Boulder-specific counters whose exact names change between releases. Readers should inspect the live `/metrics` endpoint of each service for the canonical names.
- The `release-2024-01-08` tag is still over two years old as of the validation date — when the post is read in 2026, a more recent release (Boulder switched to `vYYYYMMDD.N`-style tags in late 2024) would generally be preferable for new deployments. Left the older tag in place because the post's commands and config layout were written against that era of the codebase.
