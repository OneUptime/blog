# Validation Summary: How to Configure Hetzner Cloud Servers with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 addressing (RFC 4291)
- Hetzner Cloud (servers, primary IPs, floating IPs, firewalls)
- `hcloud` CLI
- Hetzner Cloud API v1
- Terraform `hcloud` provider (`hcloud_server`, `hcloud_floating_ip`, `hcloud_floating_ip_assignment`)
- Linux `iproute2` (`ip -6 addr add`)
- Netplan (Ubuntu)
- nginx (IPv6 `listen` directive)

## Sources Consulted
- Hetzner Cloud Primary IPs / IPv6 docs: https://docs.hetzner.com/cloud/servers/primary-ips/primary-ip-configuration/
- Hetzner Cloud deprecated server plans: https://docs.hetzner.com/cloud/servers/deprecated-plans/
- Hetzner Cloud API reference: https://docs.hetzner.cloud/reference/cloud
- `hcloud` CLI repo (firewall add-rule / apply-to-resource): https://github.com/hetznercloud/cli
- Terraform `hcloud_server`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server
- Terraform `hcloud_floating_ip`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/floating_ip
- Terraform `hcloud_floating_ip_assignment`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/floating_ip_assignment
- RFC 4291 — IPv6 Addressing Architecture (hex-only address syntax)

## Issues Found

1. **Invalid IPv6 addresses using non-hex characters.** The post used `2a01:4f8:abc:1234::web` and `2a01:4f8:abc:1234::mail` as example addresses. IPv6 addresses are restricted to hex digits (0–9, a–f) per RFC 4291; `w`, `m`, `i`, and `l` are not valid hex. These literals would be rejected by `ip -6 addr add`, by Netplan, and by nginx's `listen` directive. Replaced every occurrence of `::web` with `::beef` and `::mail` with `::cafe` (both are valid, mnemonic, all-hex addresses) — this affected the `ip` command block, the Netplan YAML, and the nginx server blocks.

2. **Deprecated `cx21` server type.** The Terraform example specified `server_type = "cx21"`. Hetzner moved `cx21` to the deprecated plans list when introducing the Gen2 shared-CPU lineup; new orders should use `cx22`. Updated `cx21` → `cx22`.

## Review Notes
- The remaining technical content was verified against current Hetzner Cloud, hcloud CLI, and Terraform provider documentation — all flag names, resource attributes, and API paths are correct as of 2026-05-04.
- `hcloud_server.ipv6_address` correctly returns the primary IPv6 (the provider previously returned the network address; the documented behavior is the first/primary host address).
- For larger fleets, Hetzner's newer `hcloud_primary_ip` resource gives more explicit lifecycle control over primary IPv6 than relying on auto-creation, but the auto-creation pattern shown here is still valid.
- The `cx22` instance is sized for demonstration; production workloads should pick a server type that matches actual CPU/RAM needs.
