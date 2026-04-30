# Validation Summary: How to Set Up GCP VPC Peering with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC Network Peering
- Google Cloud VPC firewall rules
- OpenTofu / Terraform HCL
- HashiCorp Google provider

## Sources Consulted
- Google Cloud: VPC Network Peering — https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud: About peering connections — https://cloud.google.com/vpc/docs/about-peering-connections
- Google Cloud: Set up and manage VPC Network Peering — https://cloud.google.com/vpc/docs/using-vpc-peering
- Google Cloud: VPC firewall rules — https://cloud.google.com/firewall/docs/firewalls
- Terraform Registry: `google_compute_network_peering` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_peering
- Terraform Registry: `google_compute_firewall` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Registry: `google_compute_subnetwork` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The peering example included `export_custom_routes` / `import_custom_routes` and `export_subnet_routes_with_public_ip` / `import_subnet_routes_with_public_ip` in a basic RFC1918 peering setup. I removed those settings because private IPv4 subnet routes are exchanged automatically once both peering configurations exist, and the public-IP route flags apply only to privately used public IPv4 subnet ranges.
- The limitation note said to use Shared VPC or Cloud VPN for transitive connectivity. I changed it to instruct readers to create a separate peering connection between VPC-A and VPC-C, which matches Google Cloud's documented non-transitive peering behavior.
- The summary claimed VPC peering has "no bandwidth limits." I changed that to say peering traffic has the same throughput and availability as traffic within the same VPC network, which matches the Google Cloud documentation.

## Review Notes
- The example is valid for IPv4-only peering. If a reader needs IPv6 route exchange, both peering resources must use `stack_type = "IPV4_IPV6"`.
- The firewall example permits new connections from VPC B to VPC A only; return traffic is covered by Google Cloud's stateful firewall behavior.
