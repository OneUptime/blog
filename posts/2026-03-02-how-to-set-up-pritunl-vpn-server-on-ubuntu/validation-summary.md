# Validation Summary: How to Set Up Pritunl VPN Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pritunl (web-based OpenVPN management)
- OpenVPN
- MongoDB 6.0
- Ubuntu 20.04 / 22.04
- UFW (firewall)
- Let's Encrypt / Certbot
- Nginx (as optional reverse proxy)
- TOTP MFA (Google Authenticator)
- `pritunl-client-electron` (desktop client)

## Sources Consulted
- Pritunl Commands reference: https://docs.pritunl.com/docs/commands
- Pritunl Installation docs: https://docs.pritunl.com/docs/installation
- Pritunl Repositories docs: https://docs.pritunl.com/docs/repo
- Pritunl Custom SSL Certificate docs: https://docs.pritunl.com/docs/custom-ssl-certificate
- Pritunl source code (`__main__.py`): https://raw.githubusercontent.com/pritunl/pritunl/master/pritunl/__main__.py
- Pritunl PGP signing key: https://raw.githubusercontent.com/pritunl/pgp/master/pritunl_repo_pub.asc
- MongoDB 6.0 installation on Ubuntu: https://www.mongodb.com/docs/v6.0/tutorial/install-mongodb-on-ubuntu/

## Issues Found
1. **Invented CLI command `pritunl set-server-ip`.** This command does not exist in the Pritunl source code's command dispatcher (verified against `__main__.py`). The public server address is set in the web UI, not via CLI.
   - **Fix:** Removed the `set-server-ip` line and added a sentence clarifying that the public address is configured in the web UI on the initial setup screen or under the host's Public Address field.

2. **Invented CLI command `pritunl settings`.** This is not a valid subcommand. The correct way to inspect configuration via CLI is `pritunl get <category>` (e.g. `pritunl get app`), which is supported by the `get` handler in source.
   - **Fix:** Replaced `sudo pritunl settings` with `sudo pritunl get app` and a `sudo pritunl get app.server_port` example, plus a `sudo pritunl unset app.server_port` example to round out the CLI section.

3. **Invented CLI command `pritunl users`.** No such command exists. Connected-user listings are only available in the web UI / API.
   - **Fix:** Replaced the `pritunl users` line in Monitoring with `sudo pritunl logs`, which is a real subcommand and useful for the same operational context.

## Review Notes
- The Pritunl repository GPG fingerprint `7568D9BB55FF9E5287D586017AE645C0CF8E292A` matches the official `pritunl_repo_pub.asc` and is correct.
- The configuration keys used with `pritunl set` (`app.server_ssl`, `app.server_port`, `app.server_cert`, `app.server_key`) match Pritunl's documented custom SSL certificate workflow.
- `apt-key adv` is deprecated on Ubuntu 22.04+ (still functional but emits a warning); Pritunl's current docs prefer `signed-by=/usr/share/keyrings/pritunl.gpg` style entries. The author already offers a `curl ... | apt-key add -` alternative, so this is acceptable for now but could be modernised in a future revision.
- The MongoDB 6.0 instructions are valid for Ubuntu 20.04 (focal) and 22.04 (jammy). Newer Pritunl + Ubuntu 24.04 installations now ship with MongoDB 8.0, so this guide is version-locked to the 20.04/22.04 scope it advertises.
- `mongodump` is shipped via the `mongodb-database-tools` package (pulled in by the `mongodb-org` meta-package), so the backup command works after the install steps in this post.
- The `pritunl-client-electron` package name is correct for the Ubuntu desktop client.
