# Validation Summary: How to Configure Negative Caching for Error Responses in Google Cloud CDN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud Load Balancing
- Google Cloud CLI
- Terraform Google provider
- Cloud Logging

## Sources Consulted
- Google Cloud CDN negative caching documentation: https://docs.cloud.google.com/cdn/docs/using-negative-caching
- Google Cloud SDK `gcloud compute backend-services update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Terraform `google_compute_backend_service` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Google Cloud CDN logging documentation: https://docs.cloud.google.com/cdn/docs/logging
- Google Cloud custom error response documentation: https://docs.cloud.google.com/load-balancing/docs/https/configure-custom-error-responses
- Google Cloud SDK `gcloud compute url-maps edit` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/edit

## Issues Found
- The post claimed Cloud CDN negative caching could cache arbitrary error status codes such as 500, 502, and 503. Cloud CDN negative caching supports only specific status codes, including 300, 301, 302, 307, 308, 404, 405, 410, 421, 451, and 501. Updated the explanation, examples, TTL guidance, custom error page example, and performance table to avoid unsupported 500, 502, and 503 negative caching claims.
- The default TTL list was incomplete and said 405 responses are cached for 120 seconds. Google Cloud documents 405 as 60 seconds, 410 and 451 as 120 seconds, 501 as 60 seconds, and 300, 301, and 308 redirects as 10 minutes. Updated the default behavior section.
- The `gcloud --negative-caching-policy` example used a JSON array. The current `gcloud compute backend-services update` syntax uses comma-separated `CODE=TTL` entries. Updated the command to use `404=60,405=60,410=120,451=120,501=60`.
- The Terraform example used unsupported negative caching policy codes 500, 502, and 503. Replaced them with supported codes 451 and 501.
- The TTL guidance suggested 410 responses could be cached for 3600 seconds. Cloud CDN negative caching policy TTLs have a maximum of 1800 seconds. Updated the recommendation.
- The Cloud Logging examples filtered and formatted `jsonPayload.cacheHit`, but cache hit is recorded as `httpRequest.cacheHit`. Updated both logging commands.
- The custom error response YAML used shortened resource references and unsupported cached 5xx examples. Updated the YAML to use full Compute API resource URLs and supported 404 and 501 examples.

## Review Notes
Google Cloud's current Cloud CDN negative caching documentation includes 302 and 307 as supported `gcloud` policy codes, while the Terraform provider documentation lists a narrower set in some indexed snippets. The post's Terraform example now uses only codes supported by both documented surfaces.
