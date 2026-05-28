# Validation Summary: How to Configure Cache Modes and TTL Settings for Google Cloud CDN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud Load Balancing backend services
- Google Cloud backend buckets
- Google Cloud CLI
- Cloud Logging
- Terraform Google provider
- HTTP caching headers

## Sources Consulted
- Google Cloud CDN caching overview: https://docs.cloud.google.com/cdn/docs/caching
- Google Cloud CDN cache modes guide: https://docs.cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud CDN TTL overrides guide: https://docs.cloud.google.com/cdn/docs/using-ttl-overrides
- Google Cloud CDN logging guide: https://docs.cloud.google.com/cdn/docs/logging
- gcloud backend services update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- gcloud backend buckets update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/update
- Terraform Google provider `google_compute_backend_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider `google_compute_backend_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_bucket

## Issues Found
- Corrected the FORCE_CACHE_ALL description. Google documents it as caching successful responses and overriding origin cache directives, not literally all responses in every circumstance.
- Corrected TTL semantics. `max_ttl` is used for `CACHE_ALL_STATIC`; `FORCE_CACHE_ALL` uses `default_ttl` instead of origin freshness headers and does not support `max_ttl`.
- Corrected the USE_ORIGIN_HEADERS interaction section. Origin TTLs are used directly; TTL overrides such as default TTL and max TTL are not applied in that cache mode.
- Corrected the testing guidance. Cloud CDN does not emit `X-Cache-Status` by default; cache status can be checked in Cloud Logging or exposed through a configured custom response header using `cdn_cache_status`.
- Corrected the Cloud Logging format field from `jsonPayload.cacheHit` to `httpRequest.cacheHit`.
- Clarified the client TTL pitfall because Cloud CDN has a default client TTL; the risk is setting an overly long client TTL, not omitting the setting entirely.
- Updated the supported `Vary` header list to match current Cloud CDN documentation.
- Removed the suggestion to rely on FORCE_CACHE_ALL for Set-Cookie responses and clarified that Set-Cookie should not be sent on static assets expected to be cached.

## Review Notes
The Google Cloud CLI commands and Terraform resource fields used in the post match current official references. The local environment did not have `gcloud` available, so CLI verification was performed against official Google Cloud SDK reference documentation.
