# Validation Summary: How to Set Up Tailscale VPN on Ubuntu for Zero-Config Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tailscale (mesh VPN)
- WireGuard (underlying VPN protocol)
- Ubuntu (jammy / 22.04 repository example)
- systemd (tailscaled service)
- Linux IP forwarding (sysctl `net.ipv4.ip_forward`, `net.ipv6.conf.all.forwarding`)
- Tailscale ACL JSON policy language
- Tailscale SSH
- MagicDNS
- DERP relay servers
- Headscale (mentioned as self-hosted alternative)

## Sources Consulted
- Tailscale official Ubuntu install docs: https://tailscale.com/kb/1039/install-ubuntu-2204
- Tailscale CLI reference: https://tailscale.com/kb/1080/cli
- Tailscale `tailscale up` flags reference: https://tailscale.com/kb/1241/tailscale-up
- Tailscale subnet routers documentation: https://tailscale.com/kb/1019/subnets
- Tailscale exit nodes documentation: https://tailscale.com/kb/1103/exit-nodes
- Tailscale MagicDNS docs: https://tailscale.com/kb/1081/magicdns
- Tailscale ACL policy syntax reference: https://tailscale.com/kb/1018/acls
- Tailscale SSH docs: https://tailscale.com/kb/1193/tailscale-ssh
- Tailscale auth keys docs: https://tailscale.com/kb/1085/auth-keys
- Tailscale DERP docs: https://tailscale.com/kb/1232/derp-servers
- Headscale project: https://github.com/juanfont/headscale

## Issues Found
No technical issues found. All commands, flags, configuration snippets, and JSON ACL examples align with Tailscale's current official documentation:

- `curl -fsSL https://tailscale.com/install.sh | sh` is the documented one-line installer.
- The manual repository URLs (`pkgs.tailscale.com/stable/ubuntu/jammy.noarmor.gpg` and `jammy.tailscale-keyring.list`) match the official manual installation steps for Ubuntu 22.04 (jammy).
- The systemd unit name `tailscaled` is correct.
- All `tailscale up` flags used (`--authkey`, `--advertise-tags`, `--ephemeral`, `--advertise-routes`, `--advertise-exit-node`, `--exit-node`, `--ssh`, `--force-reauth`) are valid and current.
- All `tailscale` subcommands shown (`status`, `ip`, `ip -4`, `version`, `ping`, `down`, `logout`, `debug interfaces`, `bugreport`) are valid.
- The JSON ACL examples (top-level `acls`, `groups`, `tagOwners`, `ssh` sections; `dst` syntax `tag:server:22`; `ssh` rule `users` field) match Tailscale's policy syntax.
- The `Self.DNSName` field in `tailscale status --json` output is correct.
- MagicDNS hostname format `machine-name.tailnet-name.ts.net` is correct.
- The 100.x.x.x address range is the correct CGNAT range used by Tailscale (100.64.0.0/10).
- DERP (Designated Encrypted Relay for Packets) terminology and behavior described are accurate.
- The note that Headscale is an open-source self-hosted Tailscale control server is correct.

## Review Notes
- The manual install commands reference the `jammy` (Ubuntu 22.04) repository. Users on Ubuntu 24.04 (`noble`) or other versions would need to substitute the appropriate codename in the URLs. The `install.sh` script handles this automatically. This is a minor caveat readers should be aware of, but not technically incorrect since jammy is a current LTS.
- The post does not specify a minimum Tailscale CLI version. All features described (Tailscale SSH, ephemeral nodes, exit nodes, MagicDNS, ACL `ssh` rule) are widely available in current Tailscale releases (1.x).
- The OAuth Clients section is intentionally brief and points readers toward that capability without providing a full walkthrough — acceptable scope decision for a getting-started guide.
- The `--force-reauth` flag works on `tailscale up`; some users may also use `tailscale login` for re-authentication, but the form shown is valid.
