# Validation Summary: How to Configure DNS Forwarding Zones to Resolve On-Premises Hostnames from GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS forwarding zones
- Google Cloud CLI
- Cloud VPN and Cloud Interconnect hybrid connectivity
- Compute Engine VPC networking and firewall rules
- Cloud Router custom route advertisements
- Cloud DNS query logging
- Terraform Google provider

## Sources Consulted
- Google Cloud DNS forwarding zones documentation: https://cloud.google.com/dns/docs/zones/forwarding-zones
- Google Cloud DNS zones overview and forwarding target behavior: https://cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud SDK reference for `gcloud dns managed-zones create`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud DNS logging and monitoring documentation: https://cloud.google.com/dns/docs/monitoring
- Google Cloud SDK reference for `gcloud dns policies create`: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- Cloud Router custom route advertisement documentation: https://cloud.google.com/network-connectivity/docs/router/how-to/advertising-custom-ip
- Terraform Google provider `google_dns_managed_zone` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone

## Issues Found
- The private forwarding examples used an unsupported `[private]` suffix in `--forwarding-targets`. Updated those commands to use the current `--private-forwarding-targets` flag.
- The standard versus private forwarding explanation was too broad. Updated it to reflect that standard forwarding routes RFC 1918 targets through the authorized VPC, routes non-RFC 1918 targets over the internet, and uses `35.199.192.0/19` for Type 1 and Type 2 targets.
- The firewall section incorrectly showed a VPC egress rule for on-premises forwarding targets. Replaced it with the documented ingress rule pattern for DNS servers inside the VPC, and clarified that on-premises DNS servers usually require on-premises packet filtering.
- The routing section checked for `35.199.192.0/19` as a Google Cloud route, but Cloud DNS requires on-premises return routing to that range for Type 2 targets. Updated the section to describe Cloud Router/BGP advertisements and static or policy-based VPN equivalents.
- The testing section used `dig +trace`, which does not validate the private Cloud DNS forwarding path. Replaced it with a direct query to the Compute Engine metadata server at `169.254.169.254`.
- The multiple-target explanation said Cloud DNS uses the first successful response. Updated it to match the documented ranking behavior based on successful responses and latency.
- The logging example referenced `jsonPayload.serverLatency`, which is not listed in the documented Cloud DNS query log fields. Replaced it with documented fields: `destinationIP` and `egressError`.

## Review Notes
The Terraform example is consistent with the current Google provider schema for private forwarding through `forwarding_path = "private"`. The post remains a valid technical tutorial after the targeted corrections.
