# Validation Summary: How to Set Up Session Affinity with Consistent Hashing on GCP Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud backend services
- Google Cloud CLI (`gcloud`)
- Compute Engine backend service REST API
- Terraform Google provider
- Cloud Monitoring

## Sources Consulted
- Google Cloud SDK reference for `gcloud compute backend-services create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud backend services overview and session affinity behavior: https://docs.cloud.google.com/load-balancing/docs/backend-service
- Compute Engine REST API backend service fields, including `consistentHash`: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices/update
- Terraform Google provider `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider `google_compute_region_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_backend_service
- Cloud Load Balancing metrics documentation: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud Monitoring load balancer SLI examples: https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics

## Issues Found
- The HTTP cookie affinity `gcloud` example used non-existent flags `--consistent-hash-http-cookie-name` and `--consistent-hash-http-cookie-ttl`. Replaced them with the documented `--affinity-cookie-name` and `--affinity-cookie-ttl` flags.
- The generated-cookie and HTTP-cookie `gcloud` examples did not set a compatible locality load balancing policy. Added `--locality-lb-policy=RING_HASH` and `--load-balancing-scheme=EXTERNAL_MANAGED` where needed.
- The header-based `gcloud` example used a non-existent `--consistent-hash-http-header-name` flag. Replaced the example with the corresponding Compute Engine API JSON fields, including `consistentHash.httpHeaderName`.
- The minimum ring size `gcloud` example used a non-existent `--consistent-hash-minimum-ring-size` flag. Replaced it with the Compute Engine API JSON field `consistentHash.minimumRingSize` and clarified that direct tuning should use Terraform or the API.
- The Terraform HTTP examples omitted `locality_lb_policy`, which is required for consistent hashing behavior. Added `locality_lb_policy = "RING_HASH"` and explicit `load_balancing_scheme = "EXTERNAL_MANAGED"`.
- The Terraform regional TCP backend service example included a `consistent_hash` block, but Google documents consistent hash settings as applicable only to HTTP connections. Removed that block from the L4 client IP example.
- The Cloud Monitoring command used BSD `date -v-1H`, which is not valid in typical Linux/Cloud Shell environments. Replaced it with GNU `date -d '1 hour ago'`.
- The Cloud Monitoring filter used `resource.labels.backend_service_name` for the HTTPS backend request metric. Updated it to use the `https_lb_rule` monitored resource and `resource.labels.backend_target_name` label shown in Google Cloud Monitoring examples.

## Review Notes
Session affinity in Google Cloud Load Balancing is documented as best-effort. Backend health changes, backend additions or removals, weight/fullness changes, and load balancing policy changes can break affinity, so the post's operational guidance should continue to frame affinity as helpful but not a hard guarantee.
