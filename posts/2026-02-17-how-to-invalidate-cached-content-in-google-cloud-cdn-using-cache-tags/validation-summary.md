# Validation Summary: How to Invalidate Cached Content in Google Cloud CDN Using Cache Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud CLI (`gcloud`)
- Compute Engine URL Maps API
- Cloud Logging and Cloud Monitoring
- Terraform Google provider
- Nginx
- Node.js Express
- Google Cloud Build

## Sources Consulted
- Google Cloud CDN cache invalidation overview: https://docs.cloud.google.com/cdn/docs/cache-invalidation-overview
- Google Cloud CDN invalidating cached content guide: https://docs.cloud.google.com/cdn/docs/invalidating-cached-content
- Google Cloud SDK reference for `gcloud compute url-maps invalidate-cdn-cache`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/invalidate-cdn-cache
- Compute Engine API `urlMaps.invalidateCache` reference: https://docs.cloud.google.com/compute/docs/reference/rest/beta/urlMaps/invalidateCache
- Cloud CDN logs and metrics for caching: https://docs.cloud.google.com/cdn/docs/logging
- Terraform Google provider `google_compute_backend_service` reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post said invalidation only marks cached objects invalid and does not immediately delete them. Google Cloud documentation describes cache invalidation as removing the cache entry and refilling it from the backend on the next request, so the explanation was corrected.
- The invalidation limits were outdated. The post claimed one invalidation request per minute per URL map and propagation in a few minutes. Current Cloud CDN documentation says up to 500 invalidation requests per minute and that each invalidation request takes effect in about 10 seconds. The limits section was updated and cache tag limits were added.
- The Cloud Logging command used `jsonPayload.cacheHit`, but Cloud CDN cache-hit status is exposed in `httpRequest.cacheHit`; `jsonPayload` contains fields such as `statusDetails` and `cacheId`. The command was corrected.
- The post said Cloud CDN strips the `Cache-Tag` header from responses sent to clients. Current Cloud CDN documentation says cache tags from the backend `Cache-Tag` response header are sent to the client. The verification note was corrected and a caution against sensitive tag values was added.

## Review Notes
The `gcloud compute url-maps invalidate-cdn-cache --tags` examples, REST API `cacheTags` payload, URL path invalidation examples, and Terraform `google_compute_backend_service` CDN policy structure are consistent with current official documentation. The CI/CD example assumes the deployed origin actually emits matching version tags such as `v${BUILD_ID}`; otherwise the invalidation command is syntactically valid but would not match cached responses.
