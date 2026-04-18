# Validation Summary: How to Set Up a Web Server on Hetzner Cloud with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Hetzner Cloud
- hcloud Terraform provider (~> 1.49)
- Nginx
- Cloud-init
- Certbot (referenced)
- Ubuntu 24.04

## Sources Consulted
- hcloud provider docs for `hcloud_floating_ip`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/floating_ip.md
- hcloud provider docs for `hcloud_server`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server.md
- hcloud provider docs for `hcloud_firewall`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/firewall.md
- hcloud provider docs for `hcloud_floating_ip_assignment`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/floating_ip_assignment.md
- Hetzner Cloud Locations: https://docs.hetzner.com/cloud/general/locations

## Issues Found
- **`hcloud_floating_ip` used `location` instead of `home_location`.** The hcloud provider's `hcloud_floating_ip` resource exposes the argument `home_location` (not `location`). Using `location` would cause an unsupported-argument error on `tofu plan`. Changed `location = "nbg1"` to `home_location = "nbg1"` and realigned field spacing.

## Review Notes
- Firewall rules are correct: `source_ips` is the right attribute for inbound, `destination_ips` for outbound. ICMP without a `port` is valid (port is only required for TCP/UDP).
- `hcloud_floating_ip_assignment` arguments (`floating_ip_id`, `server_id`) are correct.
- `ssh_keys` on `hcloud_server` accepts a list of IDs or names, so passing `[hcloud_ssh_key.web.id]` is valid.
- `firewall_ids` on `hcloud_server` is a valid list argument.
- `server_type = "cx22"` and `image = "ubuntu-24.04"` are valid current Hetzner identifiers; `nbg1` is a valid Hetzner location (Nuremberg, Germany).
- The cloud-init snippet writes a persistent floating-IP block to `/etc/network/interfaces.d/floating-ip.cfg`. Ubuntu 24.04 uses Netplan by default rather than ifupdown, so this file will not be consumed at boot; the `ip addr add` command does configure the floating IP at runtime, but persistence across reboots would ideally be done via a Netplan drop-in or systemd-networkd. This is a design/best-practice observation, not a syntax error, so it has been left unchanged.
- The single-file nginx `server` block replaces the default site file; this is common in tutorials but authors may later want to note that `/etc/nginx/sites-enabled/default` needs to remain a symlink for the config to be loaded on Debian/Ubuntu (which it already is by default when overwriting `sites-available/default`).
