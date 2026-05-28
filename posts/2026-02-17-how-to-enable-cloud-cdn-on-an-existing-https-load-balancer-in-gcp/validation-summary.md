# Validation Summary: How to Enable Cloud CDN on an Existing HTTP(S) Load Balancer in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud CDN
- External HTTP(S) load balancing
- gcloud CLI
- HTTP caching and Cache-Control headers
- Flask

## Sources Consulted
- Google Cloud: Cloud CDN caching overview: https://cloud.google.com/cdn/docs/caching
- Google Cloud: Change cache modes: https://cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud: Change TTL settings and overrides: https://cloud.google.com/cdn/docs/using-ttl-overrides
- Google Cloud: Customize cache keys: https://cloud.google.com/cdn/docs/using-cache-keys
- Google Cloud: Use negative caching: https://cloud.google.com/cdn/docs/using-negative-caching
- Google Cloud: Invalidate cached content: https://cloud.google.com/cdn/docs/invalidating-cached-content
- Google Cloud: Logs and metrics for backend services: https://cloud.google.com/cdn/docs/cdn-logging-monitoring
- Google Cloud: Use signed URLs: https://cloud.google.com/cdn/docs/using-signed-urls
- Google Cloud SDK reference: gcloud compute backend-services update: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference: gcloud compute backend-services add-signed-url-key: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-signed-url-key

## Issues Found
- The cache mode section identified `USE_ORIGIN_HEADERS` as the default. Current Cloud CDN documentation identifies `CACHE_ALL_STATIC` as the default, so the option comments were corrected.
- The `FORCE_CACHE_ALL` explanation said every successful response gets cached and that `--default-ttl` must be set. Documentation says it caches successful responses while ignoring `private` and `no-store` directives, but it is still subject to other cacheability behavior, and `default_ttl` has a default value. The wording was corrected.
- The Cache-Control directive list said `public` is required for Cloud CDN to cache. Documentation says `public` is not generally required for cacheability, though it is best practice and is required in some authenticated request cases. The wording was corrected.
- The negative caching section implied Cloud CDN caches errors by default and that every 404 hits the backend without negative caching. Documentation shows negative caching must be enabled for policy/default negative TTL behavior, and origin headers can also make error responses cacheable. The wording was corrected.
- The monitoring command was described as showing hit and miss rates, but the filter only returns `response_from_cache` cache hits. The description was corrected to "recent CDN cache hits."
- The `gcloud compute backend-services add-signed-url-key` example included `--global`, but the current command reference does not list a `--global` flag for that subcommand. The flag was removed.

## Review Notes
The post is technically valid after the corrections. The Flask example is illustrative and assumes application-specific `get_data()` and `get_profile()` helpers exist.
