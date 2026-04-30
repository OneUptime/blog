# Validation Summary: How to Configure IPv6 Firewall Rules on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC firewall rules
- IPv6 networking
- Google Cloud CLI (`gcloud`)
- Terraform `hashicorp/google` provider
- Compute Engine VPC networking

## Sources Consulted
- Google Cloud: VPC firewall rules https://cloud.google.com/firewall/docs/firewalls
- Google Cloud: Use VPC firewall rules https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud: Compute Engine REST `firewalls` reference https://cloud.google.com/compute/docs/reference/rest/v1/firewalls
- Google Cloud: VPC networks https://cloud.google.com/vpc/docs/vpc
- Google Cloud: Subnets and IPv6 range assignment https://cloud.google.com/vpc/docs/subnets
- Google Cloud SDK: `gcloud topic filters` https://cloud.google.com/sdk/gcloud/reference/topic/filters
- HashiCorp Google provider docs source: `google_compute_firewall` https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_firewall.html.markdown
- HashiCorp Google provider docs source: `google_compute_network` https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_network.html.markdown

## Issues Found
- The `gcloud compute firewall-rules create` examples omitted `--action=ALLOW` or `--action=DENY`. I added the action flag to each command because the current CLI syntax requires either `--action` or `--allow`.
- The post used `icmpv6` as a firewall protocol in both `gcloud` and Terraform examples. I changed those to IP protocol number `58`, which is the documented way to specify ICMPv6.
- Two sample IPv6 prefixes were invalid because they used non-hexadecimal words (`admin` and `blocked`) inside the address. I replaced them with valid documentation-style IPv6 prefixes.
- The Terraform internal IPv6 example used `fd00::/8`, which is much broader than Google Cloud's assigned internal ULA ranges. I changed it to `google_compute_network.main.internal_ipv6_range` so the example matches the VPC network's actual assigned `/48` internal IPv6 range.
- The ICMPv6 guidance said to use Cloud Armor or Google Cloud IDS for granular ICMPv6 filtering. I removed that advice and rewrote the note to state the actual VPC firewall limitation: these rules can match protocol, but not ICMPv6 type or code.
- The audit command labeled as listing IPv6 firewall rules did not actually filter for IPv6, and the source-range filter used an unclear expression. I updated the commands to use the documented `~` regex filter operator to match IPv6 CIDRs by the presence of `:`.
- The egress allow example implied that a custom allow rule is the normal way to permit outbound IPv6. I adjusted the wording to make it clear that this is an explicit tagged rule, which matters because IPv6-enabled VPCs already have an implied allow egress rule unless a higher-priority rule overrides it.

## Review Notes
- The post is technically valid after the fixes above.
- `gcloud` was not installed in this workspace, so the CLI examples were verified against the current Google Cloud documentation instead of local `--help` output.
- The Terraform examples were checked against the current `hashicorp/google` provider documentation source.
