# Validation Summary: How to Create Hetzner Cloud Floating IPs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Hetzner Cloud (`hcloud`) Terraform provider
- Hetzner Cloud Floating IPs (IPv4 and IPv6)
- cloud-init (`#cloud-config`, `runcmd`)
- Linux `ip` command for network interface configuration

## Sources Consulted
- Hetzner Cloud Terraform provider — `hcloud_floating_ip` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/floating_ip.md
- Hetzner Cloud Terraform provider — `hcloud_floating_ip_assignment` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/floating_ip_assignment.md
- Hetzner Docs — Persistent Floating IP configuration: https://docs.hetzner.com/cloud/floating-ips/persistent-configuration/
- Terraform Registry — hetznercloud/hcloud provider: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs

## Issues Found
- **`location` argument on `hcloud_floating_ip` is incorrect.** The `hcloud_floating_ip` resource does not have a `location` argument; the correct argument name for the home/routing location of an unassigned Floating IP is `home_location`. Fixed in both the IPv4 example ("Creating a Floating IP" section) and the IPv6 example ("IPv6 Floating IP" section). Verified against the official provider documentation, which lists `home_location` (not `location`) as the optional argument used when `server_id` is not specified.

## Review Notes
- `hcloud_floating_ip_assignment` arguments (`floating_ip_id`, `server_id`) and the `ip_address` exposed attribute used in the `output` block are correct.
- The `hcloud_server` examples use valid current values (`ubuntu-24.04` image, `cx22` server type, `nbg1` location).
- The cloud-init snippet uses `runcmd`, which only executes on first boot. For configuration that survives reboots, Hetzner's official documentation recommends declarative network configuration (e.g. a netplan file under `/etc/netplan/` or an ifupdown stanza under `/etc/network/interfaces.d/`). The `runcmd` approach shown will work for the initial provisioning but is not strictly persistent across reboots — worth noting in a future revision.
- The `ip route add ${floating_ip} dev eth0` line in the cloud-init `runcmd` is technically redundant after `ip addr add ${floating_ip}/32 dev eth0`, since the `/32` address assignment already installs a local kernel route for that IP. It is not harmful, just unnecessary.
- Newer Hetzner Cloud Ubuntu images may use predictable interface names (e.g. `enp1s0`) instead of `eth0` in some configurations; `eth0` is correct for the standard Hetzner Cloud Ubuntu images at the time of writing.
