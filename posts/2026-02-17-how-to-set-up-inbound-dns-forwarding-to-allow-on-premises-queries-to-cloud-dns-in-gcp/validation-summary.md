# Validation Summary: How to Set Up Inbound DNS Forwarding to Allow On-Premises Queries to Cloud DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS
- Cloud DNS server policies and inbound forwarding
- Google Cloud CLI
- Cloud VPN and Cloud Interconnect
- Cloud Logging
- Windows DNS Server
- BIND
- Unbound
- dnsmasq
- Terraform Google provider

## Sources Consulted
- Google Cloud DNS server policies overview: https://cloud.google.com/dns/docs/server-policies-overview
- Google Cloud DNS server policy configuration guide: https://cloud.google.com/dns/docs/policies
- Google Cloud DNS overview: https://cloud.google.com/dns/docs/overview
- Google Cloud DNS logging and monitoring documentation: https://cloud.google.com/dns/docs/monitoring
- Google Cloud CLI `gcloud dns policies create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- Google Cloud CLI `gcloud dns policies update` reference: https://cloud.google.com/sdk/gcloud/reference/dns/policies/update
- Terraform Google provider `google_dns_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_policy
- Microsoft Learn `Add-DnsServerConditionalForwarderZone` documentation: https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverconditionalforwarderzone
- ISC BIND 9 Administrator Reference Manual: https://bind9.readthedocs.io/
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- dnsmasq project documentation and man page: https://dnsmasq.org/doc.html

## Issues Found
- The post incorrectly instructed readers to create a Google Cloud firewall rule for inbound DNS traffic to Cloud DNS inbound forwarder entry points. Google Cloud documentation states that Google Cloud firewall rules do not apply to those regional internal entry point addresses and that Cloud DNS accepts TCP and UDP port 53 traffic automatically. I replaced that step with routing and on-premises firewall verification guidance.
- The post described forwarder IP creation as one IP in every subnet. Google Cloud creates entry points from primary IPv4 ranges of eligible subnets, excluding special-purpose subnets such as proxy-only subnets and subnets used by Cloud NAT for Private NAT. I updated the wording to say eligible subnets.
- The multi-region guidance implied that DNS forwarding should simply prefer the closest region and can fall back across regions without qualification. Google recommends using an entry point in the same region as the Cloud VPN tunnel, Cloud Interconnect VLAN attachment, or Router appliance receiving the query. I updated the guidance to reflect same-region hybrid connectivity and qualified the redundancy advice.
- The Cloud Logging query used `jsonPayload.sourceType`, but the documented Cloud DNS log field is `jsonPayload.source_type`. I corrected the filter.
- The troubleshooting section included Google Cloud firewall rules as a timeout cause. I replaced that with route advertisement checks and on-premises firewall checks.
- The forwarder IP troubleshooting note did not mention excluded special-purpose subnets. I updated it to include the documented subnet eligibility caveat.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output. The Windows DNS, BIND, Unbound, dnsmasq, and Terraform snippets match the documented syntax for the features shown.
