# Validation Summary: How to Configure Hetzner Cloud IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hetzner Cloud
- IPv6
- Hetzner Cloud Networks
- Linux networking tools (`ip`, `ip6tables`, `dig`, `curl`, `ping`)
- Terraform (`hetznercloud/hcloud` provider)
- DNS and reverse DNS (PTR/rDNS)

## Sources Consulted
- Hetzner Docs: Server overview and network options: https://docs.hetzner.com/cloud/servers/overview/
- Hetzner Docs: Server FAQ, including Primary IPv6 assignment caveats and IPv6-only behavior: https://docs.hetzner.com/cloud/servers/faq/
- Hetzner Docs: Primary IP configuration examples and IPv6 gateway `fe80::1`: https://docs.hetzner.com/cloud/servers/primary-ips/primary-ip-configuration/
- Hetzner Docs: Cloud server rDNS behavior for IPv6: https://docs.hetzner.com/cloud/servers/cloud-server-rdns/
- Hetzner Docs: Creating a Network and RFC 1918 private ranges: https://docs.hetzner.com/networking/networks/getting-started/creating-a-network/
- Hetzner Docs: Networks FAQ confirming private Networks support IPv4 only: https://docs.hetzner.com/networking/networks/faq/
- Hetzner Cloud CLI manual: `hcloud server create`: https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_server_create.md
- Hetzner Cloud CLI manual: `hcloud server set-rdns`: https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_server_set-rdns.md
- Terraform provider docs: `hcloud_server` resource schema and `public_net` block: https://raw.githubusercontent.com/hetznercloud/terraform-provider-hcloud/main/docs/resources/server.md
- Local CLI help output used to verify command syntax: `ping -h`, `curl --help all`, `dig -h`, `ip -6 route help`, `ip6tables -h`

## Issues Found
- The description and introduction implied Hetzner private Networks can be used for IPv6. Hetzner private Networks are IPv4-only, so I corrected the wording to describe public IPv6 paired with private IPv4 for dual-stack deployments.
- Step 1 used a placeholder `echo` command that did not enable anything. I replaced it with a real `hcloud server create` example and clarified the documented requirement to power off a server before assigning a Primary IPv6 after creation.
- Step 2 used an incorrect IPv6 default gateway example (`2001:db8::1`). Hetzner documents `fe80::1` as the IPv6 gateway, so I corrected the route example and clarified that persistent OS network configuration is required.
- Step 3 used an invalid IPv6 prefix (`2001:db8:admin::/48`) and an older `state` match example. I replaced the invalid prefix with a valid documentation prefix, added loopback acceptance, and updated the established-connection example to `conntrack`.
- Step 4 was too generic for a Hetzner-specific post. I added the current `hcloud server set-rdns` example for reverse DNS while keeping the AAAA and PTR verification commands.
- Step 5 used `ping6 -c 3 2600::`, which is not a sensible public test target. I replaced it with `ping -6 -c 3 ipv6.google.com` and clarified that inbound testing must be done from another IPv6-capable host.
- Step 6 used a fictional Terraform resource and invalid fields (`example_instance`, `ipv6_enabled`, `network.ipv6_address`, `tags`). I replaced it with the current `hcloud_server` resource, the documented `public_net` block, and `labels`.

## Review Notes
- The `ip6tables` examples are valid on systems that still expose the `ip6tables` command, including nftables-backed compatibility layers. Some newer distributions prefer native `nft` rulesets instead.
- Hetzner assigns a `/64` IPv6 network to a server and uses the first address by default. If the Primary IPv6 is changed after initial creation, the guest OS needs manual reconfiguration before the address becomes usable.
