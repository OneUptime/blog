# Validation Summary: How to Configure Cloud DNS for Multi-Region Active-Active Application Routing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud DNS
- Cloud DNS routing policies
- Geolocation routing
- Weighted round robin routing
- Cloud DNS health checks
- Cloud DNS failover routing
- Google Cloud CLI
- Terraform Google provider
- Cloud Monitoring and Cloud Logging

## Sources Consulted
- Google Cloud DNS routing policies and health checks: https://cloud.google.com/dns/docs/routing-policies-overview
- Google Cloud DNS routing policy configuration guide: https://cloud.google.com/dns/docs/configure-routing-policies
- gcloud dns record-sets create reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Terraform Google provider google_dns_record_set resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set
- Terraform Google provider google_compute_health_check resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- Cloud DNS logging and monitoring documentation: https://cloud.google.com/dns/docs/monitoring
- gcloud dns policies create reference: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- Cloud Load Balancing health check logging documentation: https://cloud.google.com/load-balancing/docs/health-check-logging

## Issues Found
- The gcloud examples used `--routing-policy-data`, which is documented as deprecated. Updated the geolocation, geofence, and weighted routing examples to use repeated `--routing-policy-item` flags.
- The geofencing explanation incorrectly said users outside covered regions receive no answer. Updated the wording to match Cloud DNS behavior: geofencing affects health-check failover by keeping traffic in the matching geolocation instead of failing over to the next closest healthy geolocation.
- The external endpoint health-check example used per-region `gcloud compute health-checks create` commands with a 10-second interval. Cloud DNS external endpoint health checks use a global health check, require exactly three source regions, and require an interval from 30 to 300 seconds. Replaced the commands with a single `gcloud beta compute health-checks create` example using `--global`, `--source-regions`, and `--check-interval=30`.
- The Terraform health-checked geolocation example mixed internal load balancer health-checked targets with public-looking endpoint IPs and did not attach an external endpoint health check. Reworked it to use `google_compute_health_check`, `routing_policy.health_check`, and `health_checked_targets.external_endpoints`.
- The failover Terraform example used `internal_load_balancers` with public-looking IP addresses. Changed the sample primary and backup addresses to private IPs to align with the internal load balancer target type.
- The DNS query logging command omitted the required `--description` flag for `gcloud dns policies create`. Added a description to the command.
- The monitoring alert example used `compute.googleapis.com/instance/uptime_total`, which does not indicate Cloud DNS health-check failure. Replaced it with a Cloud Logging filter for unhealthy health check log entries.

## Review Notes
The post now uses current Cloud DNS CLI patterns and separates external endpoint health checks from internal load balancer failover examples. The sample IP addresses remain illustrative placeholders and must be replaced with real reachable endpoints or forwarding rule details in an actual deployment.
