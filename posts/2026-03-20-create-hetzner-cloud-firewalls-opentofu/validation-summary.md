# Validation Summary: How to Create Hetzner Cloud Firewalls with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Hetzner Cloud Terraform provider (`hetznercloud/hcloud`)
- Hetzner Cloud Firewalls
- Networking concepts (TCP/UDP/ICMP, CIDR, port ranges, label selectors)

## Sources Consulted
- Hetzner Cloud Terraform provider — `hcloud_firewall` resource: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/firewall
- Hetzner Cloud Terraform provider — `hcloud_firewall_attachment` resource: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/firewall_attachment
- Hetzner Cloud Firewalls overview and FAQ: https://docs.hetzner.com/cloud/firewalls/overview/ and https://docs.hetzner.com/cloud/firewalls/faq/

## Issues Found
No technical issues found.

All claims and code samples were verified against official documentation:
- `hcloud_firewall` arguments (`name`, `labels`, `rule`) and rule fields (`direction`, `protocol`, `port`, `source_ips`, `destination_ips`) are correct.
- Omitting `port` for `protocol = "icmp"` is correct — `port` is only required for `tcp` and `udp`.
- Port range syntax `"8000-9000"` is supported.
- `hcloud_firewall_attachment` supports both `label_selectors` and `server_ids`.
- The claim that outbound traffic is allowed by default until any outbound rule is defined (which then flips outbound to implicit deny) matches Hetzner's documented behavior.
- Hetzner Cloud Firewalls are confirmed to be stateful, applied at the cloud platform level, and free of charge.

## Review Notes
- Only one `hcloud_firewall_attachment` is allowed per firewall, and it should not be combined with the `apply_to` block on the firewall resource itself. The post avoids `apply_to` and uses `hcloud_firewall_attachment`, which is consistent with provider guidance.
- Hetzner allows up to 5 firewalls per server, 50 firewalls per project, and 500 effective rules per firewall — worth keeping in mind when scaling out the patterns shown.
- Existing connections are not terminated when firewall rules change — only new connections are evaluated against the new ruleset.
- ICMP rules with `source_ips = ["0.0.0.0/0", "::/0"]` are valid; on IPv6, "ICMP" in the provider covers ICMPv6 as well, which is required for path MTU discovery and neighbor discovery in many setups.
