# Validation Summary: How to Use DNS-Based Failover for GCP Services Using Cloud DNS Routing Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS routing policies
- Cloud DNS failover and geolocation routing
- Google Cloud Compute Engine health checks
- Google Cloud CLI (`gcloud`)
- Cloud Logging and Cloud Monitoring alerting
- DNS TTL behavior
- Python Flask health check endpoints

## Sources Consulted
- Cloud DNS routing policies and health checks: https://cloud.google.com/dns/docs/routing-policies-overview
- Configure DNS routing policies and health checks: https://cloud.google.com/dns/docs/configure-routing-policies
- `gcloud dns record-sets create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- `gcloud dns record-sets update` reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- `gcloud compute health-checks create https` reference: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/https
- Health check logging information: https://cloud.google.com/load-balancing/docs/health-check-logging
- `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post claimed the approach works with Cloud Run custom domains as direct IP targets. Cloud Run custom domains do not provide stable direct A-record IP targets in the way the examples require, so the wording was narrowed to stable IP endpoints such as Compute Engine instances, external load balancers, and on-premises endpoints.
- The health check examples used HTTP health checks on port 443 and combined `--port` with `--use-serving-port`. Changed the examples to HTTPS health checks on port 443 and removed the conflicting flag.
- The Cloud DNS external endpoint health check interval was set to `10s`, but Cloud DNS external endpoint health checks require a 30-300 second interval. Changed intervals to `30s`.
- The health check examples omitted Cloud DNS source regions and logging. Added `--source-regions` with three regions and `--enable-logging`.
- The failover record example started a transaction but used `gcloud dns record-sets create`, which is not part of a transaction. Removed the unused transaction commands.
- The failover command used a direct IP address as `--routing-policy-primary-data` with health checking. Current `gcloud` documentation requires forwarding rule references for health-checked load balancer targets, so the example now uses forwarding rule names and `--enable-health-checking`.
- The failover command used deprecated `--routing-policy-backup-data`. Replaced it with repeated `--routing-policy-backup-item` flags.
- The geolocation example created multiple health checks but attached none of them correctly. Replaced it with a single Cloud DNS external endpoint health check and attached it with `--health-check`.
- The geolocation example used deprecated `--routing-policy-data`. Replaced it with repeated `--routing-policy-item` flags.
- The TTL update examples omitted the required record data or routing policy data for `gcloud dns record-sets update`. Updated the examples to include the full routed policy or `--rrdatas`.
- The monitoring Python example queried a non-existent health check metric. Replaced it with a Cloud Logging API example that reads health check transition logs.
- The alerting example used obsolete or invalid threshold flags and a non-existent metric. Replaced it with a logs-based metric and a current `gcloud monitoring policies create` command using `--if`.
- The failover test script blocked fixed Google health check source ranges. Cloud DNS external endpoint health check source IP ranges are not fixed, so the script now instructs the operator to make and restore the primary endpoint unhealthy in a controlled way.
- Removed an unused `google.cloud.firestore` import from the Flask health check example.

## Review Notes
The post is now technically valid for the documented Cloud DNS routing policy patterns. One practical caveat remains: DNS failover timing depends on resolver and client caching behavior, so real failover time can exceed the configured TTL.
