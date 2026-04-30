# Validation Summary: How to Configure Hetzner Cloud IPv6 with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hetzner Cloud
- Terraform
- IPv6
- Ubuntu Netplan
- Reverse DNS (rDNS)

## Sources Consulted
- Hetzner Cloud Terraform provider `hcloud_server` docs: https://raw.githubusercontent.com/hetznercloud/terraform-provider-hcloud/v1.62.0/docs/resources/server.md
- Hetzner Cloud Terraform provider `hcloud_floating_ip` docs: https://raw.githubusercontent.com/hetznercloud/terraform-provider-hcloud/v1.62.0/docs/resources/floating_ip.md
- Hetzner Cloud Terraform provider `hcloud_rdns` docs: https://raw.githubusercontent.com/hetznercloud/terraform-provider-hcloud/v1.62.0/docs/resources/rdns.md
- Hetzner Cloud provider latest release (`v1.62.0`, published 2026-04-28): https://api.github.com/repos/hetznercloud/terraform-provider-hcloud/releases/latest
- Hetzner Cloud API changelog entry about deleting assigned Primary IPs and Floating IPs (`v1.60.0+` required after 2026-05-01): https://docs.hetzner.cloud/changelog
- Hetzner Cloud server overview and network options: https://docs.hetzner.com/cloud/servers/overview/
- Hetzner deprecated server plans list (`cx22` no longer available for order): https://docs.hetzner.com/cloud/servers/deprecated-plans/
- Hetzner Floating IP overview: https://docs.hetzner.com/cloud/floating-ips/overview/
- Hetzner Floating IP FAQ: https://docs.hetzner.com/cloud/floating-ips/faq/
- Hetzner Floating IP persistent configuration docs: https://docs.hetzner.com/cloud/floating-ips/persistent-configuration
- Hetzner Cloud server rDNS docs: https://docs.hetzner.com/cloud/servers/cloud-server-rdns/
- `ping` CLI help from iputils (`ping -6`): verified locally with `ping -h`

## Issues Found
- The post pinned `hetznercloud/hcloud` to `~> 1.44`. Hetzner's API changelog says Terraform provider `v1.60.0+` is required before 2026-05-01 for assigned Primary IP/Floating IP deletion behavior, so the post was updated to `~> 1.62`.
- The example server type used `cx22`, which Hetzner lists as a deprecated plan that is no longer available for new orders. It was updated to `cx23`.
- The server example referenced `hcloud_ssh_key.main.id` without defining that resource. It was replaced with a valid `ssh_keys` example using an existing SSH key name.
- The prose and output description around `ipv6_address` implied it was the whole `/64`. Provider docs state `ipv6_address` is the first IPv6 address of the assigned network, while `ipv6_network` is the `/64`. The wording was corrected.
- The persistent Netplan example used `/128` for the floating IPv6. Hetzner's persistent Netplan example uses `/64`, so the snippet was corrected and `renderer: networkd` was added to match Hetzner's documented example.
- The rDNS example configured PTR for the server's primary IPv6 even though the preceding steps were configuring a Floating IPv6. The example was updated to use `floating_ip_id` and the Floating IPv6 address instead.
- The test command used `ping6`. The locally documented current iputils syntax is `ping -6`, so the example was updated for portability and current usage.

## Review Notes
- `ubuntu-22.04` still appears technically plausible, but the provider's current examples use newer images such as `ubuntu-24.04`.
- The Terraform provider still auto-generates IPv4 and IPv6 Primary IPs when `public_net` is omitted, even though Hetzner's platform-level docs describe public IPs as optional. The post now makes that provider-specific behavior explicit.
