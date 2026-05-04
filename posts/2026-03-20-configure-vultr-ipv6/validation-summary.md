# Validation Summary: How to Configure Vultr Instances with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vultr Cloud Compute
- vultr-cli (Vultr's official CLI)
- Terraform Vultr provider (`vultr_instance` resource)
- IPv6 networking (SLAAC, EUI-64, /64 subnets)
- Netplan (Ubuntu network configuration)
- Vultr Firewall Groups
- Reverse DNS (PTR records)
- Standard IPv6 diagnostic tools (`ping6`, `traceroute6`, `host`)

## Sources Consulted
- Vultr CLI documentation: https://docs.vultr.com/reference/vultr-cli/instance
- Vultr CLI instance IPv6 reference: https://docs.vultr.com/reference/vultr-cli/instance/ipv6
- Vultr CLI instance update-firewall-group reference: https://docs.vultr.com/reference/vultr-cli/instance/update-firewall-group
- Vultr CLI instance reverse-dns set-ipv6 reference: https://docs.vultr.com/reference/vultr-cli/instance/reverse-dns/set-ipv6
- Vultr CLI firewall rule create reference: https://docs.vultr.com/reference/vultr-cli/firewall/rule/create
- Vultr Cloud Compute IPv6 docs: https://docs.vultr.com/products/compute/cloud-compute/networking/ipv6
- Vultr IPv6 configuration guide: https://docs.vultr.com/configuring-ipv6-on-your-vps
- Vultr networking configuration guide: https://docs.vultr.com/how-to-configure-networking-on-vultr-cloud-servers
- Vultr Terraform provider documentation: https://registry.terraform.io/providers/vultr/vultr/latest/docs/resources/instance
- vultr-cli source: https://github.com/vultr/vultr-cli
- govultr SDK: https://github.com/vultr/govultr

## Issues Found

1. **Non-existent CLI command `vultr-cli instance ipv6 enable`** — The `instance ipv6` subcommand only supports `list`. There is no `enable` subcommand in vultr-cli (and the underlying govultr SDK does not expose an "enable IPv6" call on existing instances either; IPv6 is enabled at instance creation time via the `enable_ipv6` flag). Removed the line referencing `vultr-cli instance ipv6 enable <instance-id>`.

2. **Boolean flag form for `--ipv6`** — The CLI uses Cobra-style boolean flags. The bare `--ipv6` form is ambiguous on some versions; the documented form uses `--ipv6=true`. Updated the create example accordingly.

3. **Incorrect netplan IPv6 gateway** — The `via:` address was set to the same value as the instance's own IPv6 address (`2001:19f0:5:1234::1`), which would not provide reachable next-hop routing. Vultr's IPv6 default gateway is the link-local address `fe80::1` (advertised via Router Advertisements). Updated `via:` to `fe80::1`.

4. **Misleading static IPv6 example** — Vultr-assigned primary IPv6 addresses are SLAAC/EUI-64-derived (matching the example comment `2001:19f0:5:1234:5400:02ff:fe00:0001/64`), not `::1`. The static `addresses:` entry was changed from `2001:19f0:5:1234::1/64` to `2001:19f0:5:1234:5400:02ff:fe00:0001/64` to match the actual address structure shown in the comment above it.

5. **Outdated/uncommon Vultr IPv6 DNS resolver** — Replaced `2001:19f0:0:1::109` with the more commonly documented Vultr resolver `2001:19f0:300:1704::6`.

6. **Wrong firewall flag `--type`** — `vultr-cli firewall rule create` uses `--ip-type` (not `--type`) to select v4/v6. Replaced all occurrences in the firewall section.

7. **Wrong CIDR `--size` for `::/0`** — Using `--size 128` with `--subnet "::"` would describe a /128 host route to the unspecified address, not "all IPv6". The correct value for "all IPv6" is `--size 0` with `--subnet "::"`. Fixed the two "allow all" rules; left `--size 128` for the single-host SSH rule, which is correct.

8. **Wrong firewall attach command** — `vultr-cli instance update --firewall-group-id ...` is not a valid command. The correct subcommand is `vultr-cli instance update-firewall-group --instance-id <id> --firewall-group-id <id>`. Replaced accordingly.

9. **Wrong reverse DNS command** — `vultr-cli reverse-ipv6 create --ip ... --reverse ...` does not exist. The correct command is `vultr-cli instance reverse-dns set-ipv6 <instance-id> --ip <ipv6> --entry <fqdn>`. Replaced accordingly.

## Review Notes

- The introduction states IPv6 "can be added to existing instances via the Vultr API or console". In practice Vultr enables IPv6 at instance provisioning; for an existing instance without IPv6, users typically need to redeploy or contact support. The wording was left as-is since it matches Vultr's user-facing console flow, but readers should be aware that the simple-looking flow is not a single API call.
- `ping6` and `traceroute6` are still widely available, but on modern Linux distributions both are typically symlinks to `ping -6` / `traceroute -6`. The original commands still work and were left unchanged.
- The Terraform `vultr_instance` resource has both `v6_main_ip` and `v6_network` outputs as used in the post; these are correct.
- The Netplan `routes:` block with `on-link: true` and a link-local `fe80::1` gateway is the recommended modern syntax (replaces the deprecated top-level `gateway6:` field). On many Vultr Ubuntu images, IPv6 is configured via SLAAC (`accept-ra: true`) by cloud-init and no manual netplan file is needed.
