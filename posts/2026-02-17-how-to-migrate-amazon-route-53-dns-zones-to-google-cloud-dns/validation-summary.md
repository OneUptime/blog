# Validation Summary: How to Migrate Amazon Route 53 DNS Zones to Google Cloud DNS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon Route 53
- Google Cloud DNS
- Terraform Google provider
- Google Cloud CLI
- Python
- boto3 / AWS Route 53 API
- dnspython
- DNS records, TTLs, DNSSEC, ALIAS, CNAME, NS, SOA, MX, TXT

## Sources Consulted
- Amazon Route 53 API Reference: ListResourceRecordSets: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html
- Amazon Route 53 API Reference: ResourceRecordSet: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Google Cloud DNS records overview: https://cloud.google.com/dns/docs/records-overview
- Google Cloud DNS record management, import, export, NS/SOA behavior: https://cloud.google.com/dns/docs/records
- Google Cloud DNS logging and monitoring: https://cloud.google.com/dns/docs/monitoring
- Google Cloud CLI reference for managed-zones describe: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/describe
- Terraform Google provider: google_dns_managed_zone: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Terraform Google provider: google_dns_record_set: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set

## Issues Found
- The post description mentioned "zone transfer", but the article does not use DNS zone transfer. Changed the description to "record export, validation, and gradual cutover".
- The Route 53 zone export helper used a single `list_hosted_zones` call, which would miss zones when the API response is paginated. Updated it to use the boto3 paginator.
- The exporter did not preserve several Route 53 routing-policy indicators that matter during migration. Added fields for geolocation, multivalue answer, health check, and CIDR routing configuration so the converter can detect them.
- The converter generated ordinary Cloud DNS record sets for Route 53 routing-policy records, which could create duplicate Terraform resources for the same name/type and lose routing behavior. Updated it to skip those records and flag them for manual migration.
- Alias conversion was inaccurate. Cloud DNS supports `ALIAS`, but only for public zone apex address responses and not with DNSSEC. Updated the converter to generate apex `ALIAS` records only for `A`/`AAAA`, use `CNAME` only for non-apex address aliases where appropriate, and skip aliases without a safe automated equivalent.
- The Terraform DNSSEC comment did not mention the Cloud DNS `ALIAS` incompatibility. Updated the comment to avoid enabling DNSSEC when ALIAS records are needed.
- The TTL-lowering script advised waiting `target_ttl * 2` seconds, but existing caches can retain the old TTL. Updated the script to track the highest previous TTL changed and advise waiting at least that long.
- The validation script accepted nameserver hostnames but assigned them directly to dnspython's resolver nameserver list, which expects IP addresses. Added a helper that resolves nameserver hostnames to IP addresses.
- The validation script attempted to compare alias records automatically even though they may intentionally convert to Cloud DNS `ALIAS` or `CNAME` behavior. Updated it to skip alias records for manual verification.
- The wrap-up said Route 53 alias records do not exist in Cloud DNS. Updated the wording to reflect Cloud DNS's constrained `ALIAS` support.

## Review Notes
The examples are technically valid as migration scaffolding, but real migrations with Route 53 weighted, failover, latency, geolocation, multivalue, or CIDR routing require manual design in Cloud DNS rather than a direct record-by-record conversion. Apex `ALIAS` records also require DNSSEC to remain disabled in the Cloud DNS zone.
