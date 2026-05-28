# Validation Summary: How to Migrate DNS Records from Route 53 to Google Cloud DNS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Route 53
- Google Cloud DNS
- AWS CLI
- Google Cloud CLI
- DNS records, TTLs, delegation, aliases, and routing policies
- Python

## Sources Consulted
- AWS CLI `route53 list-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html
- AWS CLI `route53 change-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI `route53 delete-hosted-zone` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/delete-hosted-zone.html
- Google Cloud CLI `gcloud dns managed-zones create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud CLI `gcloud dns record-sets create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud CLI list/dictionary argument escaping reference: https://cloud.google.com/sdk/gcloud/reference/topic/escaping
- Google Cloud DNS records overview: https://cloud.google.com/dns/docs/records-overview
- Google Cloud DNS records import/export and record management documentation: https://cloud.google.com/dns/docs/records
- Google Cloud DNS routing policies overview: https://cloud.google.com/dns/docs/routing-policies-overview

## Issues Found
- The post said Route 53 alias records do not have a direct equivalent in Cloud DNS. Cloud DNS now supports a limited ALIAS record type at the zone apex for A and AAAA responses, so I changed the wording to explain that Route 53 aliases do not map one-to-one and must be converted based on target and record name.
- The conversion script generated unescaped `--rrdatas` values, which could break common TXT records or record data containing shell-sensitive characters. I updated the script to use `shlex.quote` and gcloud's alternate list delimiter syntax.
- The alias-record guidance suggested resolving AWS targets to IPs or CNAMEs. That can be unsafe for dynamic AWS endpoints such as ELB names, and CNAME is not valid at the zone apex. I changed the guidance to use CNAME only for valid non-apex names or Cloud DNS ALIAS at the apex when its limitations fit.
- The TTL cutover section implied that changing the Route 53 apex NS record TTL makes clients pick up new nameservers quickly. Delegation caching is controlled by the parent zone and registrar/registry behavior, so I changed the example to lower application record TTLs and clarified that parent delegation TTL may not be configurable.
- The Google Cloud DNS nameserver examples were hard-coded as `ns-cloud-a1` through `ns-cloud-a4`. Cloud DNS assigns specific nameservers for each managed zone, so I changed the example set and added a note to use the exact nameservers returned by `gcloud dns managed-zones describe`.

## Review Notes
The local environment did not have `aws` or `gcloud` installed, so command verification was performed against current official AWS CLI and Google Cloud CLI documentation. The guide remains a practical command-based migration walkthrough, but complex zones with DNSSEC, Route 53 health checks, failover, weighted, latency, or geolocation policies still require manual design beyond the simple conversion script.
