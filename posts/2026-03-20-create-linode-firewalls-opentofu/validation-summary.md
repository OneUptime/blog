# Validation Summary: How to Create Linode Firewalls with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Linode Cloud Firewalls
- Linode Terraform Provider (`linode_firewall`, `linode_instance` resources)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Linode Terraform provider `linode_firewall` resource documentation: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/firewall.md
- Terraform Registry: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/firewall

## Issues Found
No technical issues found.

All technical claims and code examples were verified against the official Linode Terraform provider documentation:
- Resource arguments (`label`, `tags`, `inbound_policy`, `outbound_policy`, `inbound`, `linodes`) are valid.
- Inbound block fields (`label`, `action`, `protocol`, `ports`, `ipv4`, `ipv6`) are valid.
- Protocol values used (`TCP`, `ICMP`) are supported.
- Action values used (`ACCEPT`, `DROP`) are supported.
- Policy values for `inbound_policy`/`outbound_policy` (`DROP`, `ACCEPT`) are supported.
- The ICMP rule correctly omits the `ports` field since ICMP does not use ports.
- The HCL splat expression `linode_instance.web[*].id` is correct syntax for assigning multiple instance IDs.
- CIDR notation in `ipv4` and `ipv6` arrays is well-formed.
- The default-deny-inbound description in the conclusion accurately reflects how Linode Cloud Firewalls work when `inbound_policy = "DROP"`.

## Review Notes
- The `linode_firewall` resource also supports additional arguments not used in the post (e.g., `disabled`, `nodebalancers`, `interfaces`, `outbound` blocks). These omissions are appropriate for an introductory tutorial scope.
- The "Private network only" comment in the database firewall example uses `10.0.0.0/16`, which is a user-defined subnet within RFC 1918 space. This works for VPC or custom private setups; it is not Linode's legacy private network range (192.168.128.0/17). The example is internally consistent but readers using Linode's legacy private network should adjust the CIDR.
- The post does not include a complete `terraform`/`required_providers` block or a `provider "linode"` block, but this is consistent with focused snippet-style examples and is not a technical error.
