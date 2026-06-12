# Validation Summary: How to Use Tailscale for Zero-Trust Networking

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough of Tailscale features from device onboarding through ACLs, subnet routing, exit nodes, Tailscale SSH, IdP integration, and monitoring.

## Technologies Covered
- Tailscale (CLI, ACL/HuJSON policy, MagicDNS, Tailscale SSH, exit nodes, subnet routers, SCIM)
- WireGuard (underlying tunnel protocol)
- Linux sysctl / IP forwarding
- Docker (Tailscale container)
- Homebrew, winget, apt (package managers)
- Identity providers: Google Workspace, Microsoft Entra ID, Okta, OneLogin, GitHub, OIDC
- Prometheus (metrics scraping)
- systemd / journalctl

## Sources Consulted
- Tailscale client metrics: https://tailscale.com/kb/1482/client-metrics
- Tailscale Docker / quick guide: https://tailscale.com/kb/1282/docker, https://tailscale.com/kb/1453/quick-guide-docker
- Tailscale exit nodes: https://tailscale.com/kb/1103/exit-nodes
- Tailscale SCIM (Entra ID): https://tailscale.com/kb/1249/sso-entra-id-scim
- Tailscale SCIM general: https://tailscale.com/kb/1428/scim
- Tailscale SSH: https://tailscale.com/kb/1193/tailscale-ssh
- Tailscale ACL syntax / HuJSON: https://tailscale.com/kb/1018/acls
- Tailscale install script: https://tailscale.com/kb/1031/install-linux

## Issues Found

1. **SCIM endpoint URL was incorrect.** The post originally listed `https://api.tailscale.com/api/v2/tailnet/{tailnet}/scim/v2`, but Tailscale's SCIM service is not under the standard API host. The correct base URL is `https://controlplane.tailscale.com/scim/v2/`, with an additional `?aadOptscim062020` query string required for Microsoft Entra ID. Updated the SCIM section to reflect this.

2. **Prometheus metrics endpoint was incorrect.** The post claimed metrics were exposed at `http://localhost:41112/metrics`. Per the official client-metrics documentation, the standard endpoint is `http://100.100.100.100/metrics` (served by the local tailscaled over the Tailscale service IP). Replaced the example and added the `tailscale metrics print` / `tailscale metrics write` CLI alternatives.

3. **Prometheus metric names used the wrong prefix.** The post used `tailscale_*` but the actual daemon-exported metrics use the `tailscaled_*` prefix (note the trailing 'd'). Additionally, `tailscale_connected_peers` is not a real metric. Replaced with the correctly named metrics (`tailscaled_inbound_bytes_total`, `tailscaled_outbound_bytes_total`, `tailscaled_advertised_routes`, `tailscaled_approved_routes`, `tailscaled_health_messages`).

## Review Notes
- The Docker example mounts `-v /dev/net/tun:/dev/net/tun`, which is common in community recipes but not strictly required by Tailscale's current official quick-guide (NET_ADMIN + NET_RAW are sufficient on most hosts). Left in place because it does not break anything and is helpful on hosts where the TUN device is not auto-created in the container.
- ACL JSON snippets use `//` comments, which is HuJSON (Tailscale's format) rather than strict JSON — this is correct for Tailscale's policy editor, but readers copying to a generic JSON validator would see errors. Worth a brief note in a future revision.
- The `tailscale exit-node list` command is correct in modern Tailscale CLIs; there is also a `tailscale exit-node suggest` companion command worth mentioning in a future update.
- The auth key prefix `tskey-auth-` shown in examples is the correct current format.
- `autogroup:internet`, `autogroup:nonroot`, and the `check` SSH action are all accurate per current ACL/Tailscale SSH documentation.
