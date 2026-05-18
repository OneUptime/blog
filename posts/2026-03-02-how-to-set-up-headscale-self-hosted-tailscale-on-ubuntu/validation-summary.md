# Validation Summary: How to Set Up Headscale (Self-Hosted Tailscale) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Headscale v0.23.0 (open-source Tailscale control server)
- Tailscale client
- WireGuard (data plane)
- DERP (Designated Encrypted Relay for Packets)
- Nginx (reverse proxy)
- Certbot / Let's Encrypt
- Ubuntu 20.04+
- systemd

## Sources Consulted
- Headscale 0.23.0 example config: https://github.com/juanfont/headscale/blob/v0.23.0/config-example.yaml
- Headscale 0.23.0 CLI source: https://github.com/juanfont/headscale/tree/v0.23.0/cmd/headscale/cli (preauthkeys.go, nodes.go, routes.go)
- Headscale releases: https://github.com/juanfont/headscale/releases
- Tailscale install script: https://tailscale.com/install.sh
- Tailscale CLI reference (tailscale up / set flags): https://tailscale.com/kb/1080/cli
- Tailscale custom DERP servers / derper: https://tailscale.com/kb/1118/custom-derp-servers/

## Issues Found

1. **Outdated database configuration syntax.** The post used the legacy top-level keys `db_type: sqlite3` and `db_path: ...`. In Headscale 0.23.0, the configuration was restructured to a nested `database:` block with `type: sqlite` (note: `sqlite`, not `sqlite3`) and `sqlite.path: ...`. Updated the YAML snippet accordingly so it matches the v0.23.0 schema.

2. **Removed deprecated `private_key_path` top-level field.** The post listed a top-level `private_key_path: /var/lib/headscale/private.key` for "the server". This legacy WireGuard private key field is no longer present in the v0.23.0 example config — only `noise.private_key_path` exists for the TS2021 Noise protocol. Removed the obsolete top-level entry and updated the surrounding comment to attach the "auto-generated on first run" note to the noise key.

3. **Incorrect default preauthkey expiration.** The post stated the default expiration is `24h`. The actual default in the v0.23.0 CLI (`DefaultPreAuthKeyExpiry = "1h"` in `cmd/headscale/cli/preauthkeys.go`) is 1 hour. Corrected the comment to say `1h`.

## Review Notes

- All other CLI commands verified against v0.23.0 source: `headscale users create/list`, `headscale preauthkeys create/list --user`, `headscale nodes list/rename/delete/move --identifier`, and `headscale routes list/enable -r` all use the correct flag names and short forms.
- The `prefixes:` block with `v4`/`v6` keys and the `derp:` block (`urls`, `paths`, `auto_update_enabled`, `update_frequency`) are correct for v0.23.0.
- The `--user` flag still accepts user names as strings in v0.23.0; readers running newer Headscale releases that move to numeric user IDs should consult their version's docs.
- The Tailscale CLI examples (`tailscale up --login-server --authkey`, `--advertise-routes`, `--advertise-exit-node`, `tailscale set --accept-routes`, `tailscale set --exit-node=`) match current Tailscale CLI behavior.
- The derper flags (`--hostname`, `--certdir`, `--http-port=-1`, `--stun-port=3478`) are accurate. The `--http-port=-1` value correctly disables the HTTP listener.
- The nginx reverse-proxy snippet is standard and works for Headscale; readers may want to add `client_max_body_size 0;` if uploading very large policy files, but this is optional.
- Headscale v0.23.0 is the current pinned version at time of review. Readers should still check the releases page for the latest stable release before deploying.
