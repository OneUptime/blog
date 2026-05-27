# Validation Summary: How to Use FQDN Targets in Cloud DNS Forwarding Zones in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS forwarding zones
- Google Cloud CLI
- Cloud DNS REST API
- Terraform Google provider
- CoreDNS
- Cloud Monitoring uptime checks and alerting policies

## Sources Consulted
- Google Cloud DNS forwarding zones documentation: https://docs.cloud.google.com/dns/docs/zones/forwarding-zones
- Google Cloud DNS zones overview: https://docs.cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud DNS managedZones REST reference: https://docs.cloud.google.com/dns/docs/reference/rest/v1/managedZones
- Google Cloud SDK `gcloud dns managed-zones create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Terraform Google provider `google_dns_managed_zone` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Google Cloud SDK `gcloud monitoring uptime create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward

## Issues Found
- The post incorrectly stated that `gcloud` does not support FQDN forwarding targets. Updated the `gcloud dns managed-zones create` example to use `--forwarding-targets=dns-server.partner.net.` and noted that Cloud DNS supports either multiple IP targets or a single FQDN target.
- The REST API example used empty `ipv4Address` and `ipv6Address` fields. Replaced them with the supported `domainName` field for FQDN forwarding targets.
- The Terraform example used fixed IPv4 addresses while describing FQDN targets. Updated it to use the provider's `domain_name` field.
- The post claimed FQDN targets must be publicly resolvable and cannot use private DNS names. Updated the explanation to match Cloud DNS behavior: FQDN targets are resolved using the VPC network's DNS resolution order, and resolved addresses must meet forwarding target network requirements.
- The private forwarding example used `[private]` suffix syntax. Updated it to the current `--private-forwarding-targets` flag.
- The monitoring uptime check command used unsupported or misplaced flags for the current CLI. Replaced `--hostname` with `--resource-labels=host=...,project_id=...` and changed `--period=60` to `--period=1`, matching the documented minute-based values.
- The alerting policy command used non-existent threshold flags. Replaced them with the documented `--if="< 1"` and `--duration=60s` flags.
- The failover section implied multiple FQDN targets can be configured in one forwarding zone and used documentation-reserved example IP ranges. Reworked it to describe multiple IP targets and FQDN resolution target selection, using private example IP addresses instead.
- The CoreDNS troubleshooting note said `health_check` controls re-resolution of the upstream. Updated it to state that `health_check` controls upstream health checks, not DNS TTL behavior.

## Review Notes
Cloud DNS charges the internal query used to resolve an FQDN forwarding target at normal Cloud DNS rates. The post does not mention pricing, but that is an operational consideration rather than a correctness issue.
