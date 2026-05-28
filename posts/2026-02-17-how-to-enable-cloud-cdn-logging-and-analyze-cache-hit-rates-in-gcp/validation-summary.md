# Validation Summary: How to Enable Cloud CDN Logging and Analyze Cache Hit Rates in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud CDN
- Cloud Load Balancing
- Cloud Logging
- Cloud Monitoring
- BigQuery
- gcloud CLI

## Sources Consulted
- Google Cloud CDN logs and metrics for backend services: https://docs.cloud.google.com/cdn/docs/cdn-logging-monitoring
- Google Cloud CDN logs and metrics for caching: https://docs.cloud.google.com/cdn/docs/logging
- Google Cloud Logging LogEntry and HttpRequest reference: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- Google Cloud Load Balancing metrics reference: https://docs.cloud.google.com/load-balancing/docs/metrics
- gcloud compute backend-services update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- gcloud compute backend-buckets update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/update
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- gcloud monitoring dashboards create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- The post used `jsonPayload.cacheHit`, `jsonPayload.cacheLookup`, `jsonPayload.cacheFillBytes`, and `jsonPayload.cacheValidatedWithOriginServer`. These cache fields are part of the `httpRequest` log field, so the field table, Logging queries, and BigQuery SQL examples were updated to use `httpRequest.*`.
- Several examples filtered boolean fields with `= false`. Google Cloud load balancer logs commonly omit boolean fields when the value is false, so the Logging queries now use `NOT field=true` and BigQuery queries use `IS NOT TRUE` where appropriate.
- The backend bucket section implied that logging could be enabled on a backend bucket with gcloud. Official documentation states that logging for load balancers with backend buckets is automatically enabled and cannot be modified or disabled, so the text and command comment were corrected to describe enabling Cloud CDN only.
- The status details list included `cache_fill` and `cache_revalidated`, which are not documented load balancer `statusDetails` success values. The list was updated to documented values: `response_from_cache`, `byte_range_caching`, `response_from_cache_validated`, and `response_sent_by_backend`.
- The alerting example claimed to alert on cache hit ratio below 70%, but the provided command only filtered `request_count` for cache hits and did not define a threshold. The example was corrected to alert when the cache-hit request rate drops below an expected baseline, with `--aggregation`, `--duration`, and `--if` flags added.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output. The dashboard example uses supported Cloud Monitoring dashboard and load balancing metric fields, but production users should tune alert thresholds and grouping to their own traffic baseline.
