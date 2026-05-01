# Validation Summary: How to Configure DigitalOcean IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- DigitalOcean Droplets
- DigitalOcean IPv6 networking
- `doctl`
- Linux networking commands (`ip`, `ping6`, `curl`, `dig`)
- `ip6tables`
- Terraform DigitalOcean provider

## Sources Consulted
- DigitalOcean IPv6 overview: https://docs.digitalocean.com/products/networking/ipv6/
- How to Enable IPv6 on Droplets: https://docs.digitalocean.com/products/networking/ipv6/how-to/enable/
- How to Enable Additional IPv6 Addresses: https://docs.digitalocean.com/products/networking/ipv6/how-to/configure-additional-addresses/
- IPv6 Quickstart: https://docs.digitalocean.com/products/networking/ipv6/getting-started/quickstart/
- IPv6 Limits: https://docs.digitalocean.com/products/networking/ipv6/details/limits/
- `doctl compute droplet create`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- `doctl compute droplet-action enable-ipv6`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet-action/enable-ipv6/
- Terraform `digitalocean_droplet`: https://docs.digitalocean.com/reference/terraform/reference/resources/droplet/
- Local `ip6tables(8)` help and man output on the review machine

## Issues Found
- The description claimed Kubernetes cluster coverage, but the post only covered Droplets. I corrected the description so it matches the article content.
- Step 1 used a placeholder `echo` command instead of actual DigitalOcean commands. I replaced it with current `doctl` examples for enabling IPv6 during Droplet creation and on an existing Droplet.
- Step 2 used an invalid default-route example that pointed the IPv6 gateway at the host address itself. I replaced it with DigitalOcean-accurate guidance: use the assigned primary IPv6 address and gateway from the Droplet's Networking tab, and use `ip -6 addr add ...` only for additional addresses from the Droplet's `/124` range.
- Step 3 included an invalid IPv6 CIDR (`2001:db8:admin::/48`) and did not allow the IPv6 HTTP traffic used later in the post's health-check example. I corrected the CIDR, updated the ICMPv6 and connection-tracking syntax, and added an IPv6 HTTP allow rule.
- Step 5 used `ping6 2600::`, which is not a reliable host target. I replaced it with Google Public DNS's IPv6 address, which DigitalOcean uses in its own IPv6 verification example, and clarified that inbound and dual-stack checks must be run from another IPv6-capable host.
- Step 6 used a non-existent Terraform resource and incorrect field names and types. I replaced it with the current `digitalocean_droplet` resource, `ipv6 = true`, and list-based `tags`.

## Review Notes
- DigitalOcean assigns 16 IPv6 addresses (`/124`) to each IPv6-enabled Droplet. One address is configured automatically, and additional addresses must come from that assigned range.
- Enabling IPv6 during Droplet creation avoids the manual OS-level network configuration required when IPv6 is enabled after the Droplet already exists.
- Reverse DNS on DigitalOcean is only automatically generated for the first IPv6 address when the Droplet name is an FQDN.
