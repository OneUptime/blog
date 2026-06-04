# Validation Summary: How to Run Mailu Mail Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose v2
- Mailu 2024.06
- Postfix
- Dovecot
- Rspamd
- Roundcube webmail
- ClamAV
- DNS records for email delivery, including MX, SPF, DKIM, DMARC, and PTR

## Sources Consulted
- Mailu 2024.06 Docker Compose setup: https://mailu.io/2024.06/compose/setup.html
- Mailu 2024.06 Docker Compose requirements: https://mailu.io/2024.06/compose/requirements.html
- Mailu 2024.06 configuration reference: https://mailu.io/2024.06/configuration.html
- Mailu 2024.06 DNS setup: https://mailu.io/2024.06/dns.html
- Mailu 2024.06 command-line reference: https://mailu.io/2024.06/cli.html
- Mailu 2024.06 setup generator: https://setup.mailu.io/2024.06/
- Docker Compose file reference for the obsolete top-level version field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker manifest checks for referenced Mailu 2024.06 GHCR images

## Issues Found
- The hardware prerequisites listed 2GB of RAM, or 4GB with ClamAV. Mailu 2024.06 documents 1GB of RAM plus 1GB of swap without ClamAV, and 3GB of RAM plus 1GB of swap with ClamAV, so the requirement was corrected.
- The port list omitted POP3, POP3S, and ManageSieve ports that the provided Compose file exposes and Mailu documents as service ports. The prerequisites and Compose snippet now include the relevant ports, including 4190 for ManageSieve.
- The setup generator URL was generic. It now points to the Mailu 2024.06 generator path to match the version used throughout the article.
- The Compose snippet used the obsolete top-level `version` field. It was removed to match the current Docker Compose specification.
- The Compose snippet referenced Mailu images under `mailu/...`, including `mailu/roundcube:2024.06`, which did not resolve in manifest checks. The images now use the working Mailu 2024.06 GHCR image names, including `ghcr.io/mailu/webmail:2024.06` for webmail.
- The Compose snippet did not configure services to use the Mailu resolver DNS address. The affected services now set `dns: 192.168.203.254`, matching Mailu's resolver-based service discovery pattern.
- The antispam service did not mount the DKIM volume, which Rspamd needs for DKIM signing. The DKIM volume is now mounted read-only into the antispam service.
- The initial admin account comment implied a boolean first-run switch and omitted `INITIAL_ADMIN_MODE`. Mailu 2024.06 recommends `ifmissing` or `update`, so `INITIAL_ADMIN_MODE=ifmissing` was added and the comment was corrected.
- The DKIM command attempted to read a key file directly from `/dkim`, which can expose the wrong artifact and is not the recommended way to retrieve DNS records. It now uses `flask mailu config-export --dns domain`.
- The backup example did not back up the DKIM volume and did not restore the admin data volume. It now includes DKIM backup and restores mail, admin data, and DKIM volumes. The host backup path is also quoted to avoid shell issues in paths with spaces.

## Review Notes
The corrected Compose snippet was validated with `docker compose config` using the article's environment block. The article still correctly recommends the official Mailu setup generator; for production use, the generated files remain preferable to maintaining a hand-written Compose file.
