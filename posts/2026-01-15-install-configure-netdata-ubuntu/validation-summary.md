# Validation Summary: How to Install and Configure Netdata on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Netdata (real-time monitoring agent)
- Ubuntu / Linux
- systemd (service management)
- UFW (firewall)
- OpenSSL (self-signed certificates)
- Docker (container monitoring and running Netdata in a container)
- Netdata Cloud (node claiming)
- Netdata health alerts, python.d / go.d plugins, streaming (parent/child)

## Sources Consulted
- Netdata Agent installation (kickstart.sh): https://learn.netdata.cloud/docs/netdata-agent/installation/linux
- kickstart.sh source and docs: https://github.com/netdata/netdata/blob/master/packaging/installer/methods/kickstart.md
- Netdata basic auth / reverse proxy discussion: https://github.com/netdata/netdata/issues/101
- Securing Netdata with nginx basic auth (community tutorials): https://community.hetzner.com/tutorials/install-secure-netdata/ , https://sleeplessbeastie.eu/2020/02/14/how-to-protect-netdata-instance-using-basic-access-authentication/
- Netdata Cloud authentication & API tokens: https://learn.netdata.cloud/docs/netdata-cloud/authentication-&-authorization

## Issues Found
1. **Outdated install URL (two occurrences).** The post used `https://my-netdata.io/kickstart.sh` for both the one-line install and the package-repository install. The official, current download URL is `https://get.netdata.cloud/kickstart.sh`. Updated both commands.
2. **Inconsistent `history` value.** The `[global]` example set `history = 3996` while its own comment described `3600 = 1 hour`. The intended value was 3600; changed `3996` to `3600` so the value matches the comment and the documented "1 hour at 1s granularity" example.
3. **Incorrect authentication guidance.** The "Enable Authentication" section instructed readers to run `netdata-claim.sh --generate-api-key` to "create a user for web access" and to create an `/etc/netdata/.htpasswd` file, implying the `[web]` `allow connections from` / `allow management from` settings enforce password authentication. This is inaccurate: `netdata-claim.sh` is for claiming a node to Netdata Cloud, not for creating dashboard users; Netdata has no built-in username/password authentication and never reads a `.htpasswd` file itself; and the `allow ... from` settings are IP-based access control, not authentication. Rewrote the section to (a) correctly describe the `[web]` settings as IP-based access restriction and (b) point readers to a reverse proxy (nginx + htpasswd) for HTTP basic authentication, which is the standard documented approach.

## Review Notes
- The `[web] ssl key` / `ssl certificate` settings shown for native HTTPS are valid for Netdata's built-in web server; left as-is.
- The `[global]` dbengine settings (`page cache size`, `dbengine multihost disk space`) and `memory mode = dbengine` use the long-standing setting names that work on the Ubuntu releases targeted by this guide. Newer Netdata versions have begun moving some of these keys into a `[db]` section, but the existing keys are still honored, so no change was made.
- The Netdata Cloud claim command uses the legacy single-dash flag style (`netdata-claim.sh -token=... -rooms=... -url=...`), which remains valid; the kickstart-based `--claim-token` flow is an alternative but the post's form is correct.
- Streaming (`stream.conf`), health alert syntax, python.d/go.d plugin config, API endpoints (`/api/v1/...`), and the Docker `docker run` invocation were all verified as accurate and current.
