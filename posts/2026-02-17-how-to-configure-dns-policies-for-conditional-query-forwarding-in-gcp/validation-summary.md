# Validation Summary: How to Configure DNS Policies for Conditional Query Forwarding in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS
- Cloud DNS forwarding zones
- Cloud DNS server policies
- Inbound and outbound DNS forwarding
- Google Cloud CLI
- Terraform Google provider
- Hybrid networking with Cloud VPN or Cloud Interconnect

## Sources Consulted
- Google Cloud DNS: Create a forwarding zone: https://cloud.google.com/dns/docs/zones/forwarding-zones
- Google Cloud DNS: Configure DNS server policies: https://cloud.google.com/dns/docs/policies
- Google Cloud DNS: DNS server policies overview: https://cloud.google.com/dns/docs/server-policies-overview
- Google Cloud DNS: Name resolution order: https://cloud.google.com/dns/docs/vpc-name-res-order
- Terraform Google provider: google_dns_managed_zone: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Terraform Google provider: google_dns_policy: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_policy

## Issues Found
- The post described conditional forwarding as being solved by DNS policies alone. Updated it to say forwarding zones and DNS server policies solve the hybrid DNS use case, because conditional domain-based forwarding in Cloud DNS is implemented with forwarding zones.
- The Cloud DNS resolution order was oversimplified and incorrectly implied that private zones always take precedence over forwarding zones. Updated it to reflect VPC-scoped resolution order, including outbound server policies, response policies, longest-suffix matching across private/forwarding/peering zones, Compute Engine internal zones, and public DNS.
- Several `gcloud dns managed-zones create` examples used the invalid `[private]` suffix syntax with `--forwarding-targets`. Replaced those examples with the documented `--private-forwarding-targets` flag.
- The outbound DNS server policy example used the invalid `[private]` suffix syntax with `--alternative-name-servers`. Replaced it with the documented `--private-alternative-name-servers` flag.
- The inbound forwarding address description said Cloud DNS allocates an IP address in each subnet. Updated it to match Google Cloud documentation: Cloud DNS creates regional internal IP addresses from primary IPv4 subnet ranges, and these can be listed with `gcloud compute addresses list --filter="purpose=DNS_RESOLVER"`.
- The alternative name server description implied VMs stop using the metadata server. Updated it to clarify that VMs still use `169.254.169.254`, and Cloud DNS forwards queries to alternative name servers.
- The forwarding troubleshooting section omitted the required Cloud DNS forwarding source range and return route. Added the `35.199.192.0/19` source range and return-route requirement for on-premises forwarding targets.
- The inbound forwarding troubleshooting section incorrectly implied Google Cloud firewall rules must allow traffic to inbound forwarding IPs. Updated it to state that Google Cloud firewall rules do not apply to these inbound forwarder IPs and Cloud DNS accepts TCP/UDP port 53 automatically.

## Review Notes
The Terraform snippets use current Google provider resource shapes for `google_dns_managed_zone` forwarding targets and `google_dns_policy` inbound forwarding. The post intentionally remains a concise tutorial; a future improvement could add a note that each VPC network can be associated with at most one DNS server policy.
