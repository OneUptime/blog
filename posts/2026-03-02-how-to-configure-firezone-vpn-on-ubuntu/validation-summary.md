# Validation Summary: How to Configure Firezone VPN on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Firezone legacy 0.7
- Docker Compose
- WireGuard
- OpenID Connect
- Google Workspace
- Okta
- UFW
- Caddy / Let's Encrypt

## Sources Consulted
- Firezone current FAQ: https://www.firezone.dev/kb/reference/faq
- Firezone current GitHub README: https://github.com/firezone/firezone
- Firezone legacy README: https://github.com/firezone/firezone/tree/legacy
- Firezone legacy Docker install docs: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/deploy/docker/readme.mdx
- Firezone legacy Docker supported platforms docs: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/deploy/docker/supported-platforms/readme.mdx
- Firezone legacy environment variable reference: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/reference/env-vars/readme.mdx
- Firezone legacy Google OIDC guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/authenticate/oidc/google/readme.mdx
- Firezone legacy Okta OIDC guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/authenticate/oidc/okta/readme.mdx
- Firezone legacy split tunneling guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/user-guides/use-cases/split-tunnel/readme.mdx
- Firezone legacy egress rules guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/user-guides/egress-rules/readme.mdx
- Firezone legacy backup guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/administer/backup/readme.mdx
- Firezone legacy debug logs and troubleshooting guides: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/administer/debug-logs/readme.mdx
- Firezone legacy upgrade guide: https://github.com/firezone/firezone/blob/legacy/website/src/app/docs/administer/upgrade/readme.mdx

## Issues Found
- The post presented the legacy installer as an omnibus package workflow, but Firezone legacy 0.7 uses Docker Compose by default. I changed the installer description, prerequisites, service list, and setup commands to match the legacy Docker installer.
- The post omitted that the legacy branch is end-of-life and that current Firezone uses a managed control plane with self-hosted gateways. I added that caveat to prevent readers from treating this as current production guidance.
- The SSL section used obsolete `/etc/firezone/firezone.rb` ACME settings. I changed it to the Docker `.env` `EXTERNAL_URL` workflow with Caddy.
- The OIDC examples used obsolete Ruby configuration snippets and incorrect callback URI form. I changed Google and Okta setup to the Firezone web UI flow and used trailing-slash callback URLs from the legacy docs.
- The split tunneling and DNS examples used outdated setting names and config keys. I updated them to Settings > Defaults and `DEFAULT_CLIENT_DNS`.
- The periodic authentication example used invalid legacy keys. I replaced it with `VPN_SESSION_DURATION=604800`.
- Backup, logging, status, troubleshooting, and upgrade commands used `firezone-ctl`, which does not apply to the Docker install path. I replaced them with Docker Compose and tar backup commands from the legacy docs.
- The firewall section allowed inbound ports but missed UFW routed traffic handling. I added `sudo ufw default allow routed`, matching Firezone's troubleshooting guidance.

## Review Notes
This post is now accurate for Firezone legacy 0.7 Docker deployments, not for current Firezone production deployments. Future updates should consider replacing the guide entirely with current Firezone gateway deployment instructions if the blog wants current-product coverage.
