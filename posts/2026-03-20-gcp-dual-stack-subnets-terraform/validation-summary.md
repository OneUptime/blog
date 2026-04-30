# Validation Summary: How to Configure GCP Dual-Stack Subnets with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Virtual Private Cloud (VPC) subnetworks
- Compute Engine
- Terraform
- Google Cloud CLI (`gcloud`)
- IPv6 dual-stack networking

## Sources Consulted
- Terraform Registry: `google_compute_network` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Registry: `google_compute_subnetwork` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Registry: `google_compute_instance` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Registry: `google_compute_firewall` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Google Cloud VPC subnet documentation - https://cloud.google.com/vpc/docs/subnets
- Google Cloud Compute Engine IPv6 configuration documentation - https://cloud.google.com/compute/docs/ip-addresses/configure-ipv6-address
- Google Cloud VPC firewall rules documentation - https://cloud.google.com/firewall/docs/firewalls
- Google Cloud firewall usage documentation - https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud CLI reference: `gcloud compute networks subnets describe` - https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/describe
- Compute Engine REST reference for subnetworks - https://cloud.google.com/compute/docs/reference/rest/v1/subnetworks

## Issues Found
- The Compute Engine instance example omitted `network_interface.stack_type = "IPV4_IPV6"`. The Terraform provider defaults the NIC stack type to `IPV4_ONLY`, so the example would not reliably create a dual-stack VM. I added the required `stack_type` field.
- The firewall example used `protocol = "icmpv6"`, which is not a valid Google Cloud firewall protocol token. Google Cloud requires IPv6 ICMP to be specified with IANA protocol number `58`. I changed the rule accordingly.
- The firewall section claimed to allow both ICMPv6 and SSH, but the original rule only allowed ICMPv6. I added a `tcp` allow block for port `22`.
- The Terraform outputs and verification command used the generic `ipv6_cidr_range` / `ipv6CidrRange` field. Google Cloud documents `externalIpv6Prefix` and `internalIpv6Prefix` as the subnet IPv6 prefix fields, while `ipv6CidrRange` is documented as internal-use in the REST reference. I updated the outputs and `gcloud` verification command to use the explicit prefix fields.
- The VM example comment on `access_config {}` was imprecise. It requests an external IPv4 address, not just any IPv4 address. I corrected the comment to match actual behavior.

## Review Notes
- The post pins the Google provider to `~> 5.0`. Current provider documentation is on the 7.x line, but the fields used in the corrected examples are still documented there, so the guide remains valid. A future refresh could update the version pin for currency.
