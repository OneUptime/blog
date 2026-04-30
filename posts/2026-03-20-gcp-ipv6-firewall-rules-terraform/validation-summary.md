# Validation Summary: How to Configure GCP IPv6 Firewall Rules with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- VPC firewall rules
- Terraform
- IPv6
- `gcloud` CLI
- `curl`

## Sources Consulted
- Google Cloud, VPC firewall rules: https://docs.cloud.google.com/firewall/docs/firewalls
- Google Cloud, Use VPC firewall rules: https://docs.cloud.google.com/firewall/docs/using-firewalls
- Google Cloud SDK reference, `gcloud compute firewall-rules list`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Terraform Google provider docs, `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Google provider docs, `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The post used `protocol = "icmpv6"` in Terraform firewall rules. Google Cloud firewall rules require IPv6 ICMP to be specified by IP protocol number `58`, so I updated both ICMPv6 examples.
- The SSH example used `2001:db8:management::/48`, which is not valid IPv6 CIDR notation. I replaced it with the valid documentation prefix `2001:db8:1234::/48`.
- The internal IPv6 example claimed to allow "all traffic" but only permitted TCP, UDP, and ICMPv6. I corrected the wording to match the actual rule behavior.
- The internal IPv6 example referenced `google_compute_subnetwork.external_ipv6.ipv6_cidr_range`, which was misleading for an internal-IPv6 example. I changed it to `google_compute_subnetwork.main.ipv6_cidr_range` and clarified that the rule uses the subnet's internal IPv6 CIDR.
- The post said GCP has an implicit allow-all ingress rule for internal traffic. That is incorrect for custom VPC networks; Google Cloud provides an implied deny ingress rule, while the default network has pre-populated firewall rules. I corrected the explanation and marked the explicit deny rule as optional.
- The verification command used an unverified filter/format combination. I updated it to a documented `gcloud compute firewall-rules list` format and a network regex filter that matches firewall rules for the named VPC.
- The post incorrectly claimed that a single GCP firewall rule can combine IPv4 and IPv6 CIDRs in `source_ranges`. Google Cloud documentation says a firewall rule can contain either IPv4 or IPv6 ranges, but not both, so I replaced that section with separate-rule guidance and a valid IPv4 companion example.

## Review Notes
- `gcloud` is not installed in this environment, so CLI syntax was validated against the official Google Cloud SDK reference rather than local `--help` output.
- The snippets assume the surrounding Terraform configuration already defines `google_compute_network.main` and a dual-stack `google_compute_subnetwork.main`.
