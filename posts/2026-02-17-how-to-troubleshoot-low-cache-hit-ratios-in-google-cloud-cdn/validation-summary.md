# Validation Summary: How to Troubleshoot Low Cache Hit Ratios in Google Cloud CDN

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud Load Balancing and Cloud Logging
- Google Cloud CLI (`gcloud`)
- NGINX
- Express.js
- HTTP caching headers

## Sources Consulted
- Google Cloud CDN caching overview: https://docs.cloud.google.com/cdn/docs/caching
- Google Cloud CDN logs and metrics for caching: https://docs.cloud.google.com/cdn/docs/logging
- Google Cloud CDN cache mode documentation: https://docs.cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud CDN cache key documentation: https://docs.cloud.google.com/cdn/docs/using-cache-keys
- Google Cloud CLI reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud external Application Load Balancer logging documentation: https://docs.cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Express `serve-static` middleware documentation: https://expressjs.com/en/resources/middleware/serve-static.html
- NGINX directive reference: https://nginx.org/r/proxy_ignore_headers

## Issues Found
- The post listed `cache_fill` as a `jsonPayload.statusDetails` value. Google Cloud's CDN logging documentation exposes cache fills through `httpRequest.cacheFillBytes`; `statusDetails` uses values such as `response_from_cache`, `response_from_cache_validated`, and `response_sent_by_backend`. Updated the text accordingly.
- The post said Cloud CDN supports only `Vary: Accept`, `Vary: Accept-Encoding`, and `Vary: Origin`. Google Cloud now documents additional supported values, including CORS preflight and Fetch Metadata headers, plus headers configured as part of the cache key. Updated the supported `Vary` list.
- The post said Cloud CDN caches GET and HEAD requests. Google Cloud's cacheability requirements state that Cloud CDN stores responses to GET requests. Updated the wording and checklist to avoid overstating HEAD caching.
- The cacheable status-code list omitted `501`, which Google Cloud lists as cacheable. Added `501`.
- The status-code section called all cacheable status codes "successful responses" even though the documented list includes error responses such as `404`, `405`, `410`, `451`, and `501`. Reworded the sentence to say Cloud CDN can cache responses with those status codes.
- The `Set-Cookie` section described the behavior only for two cache modes. Google Cloud documents `Set-Cookie` as a general cacheability blocker, so the wording was broadened to "by default."

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI flags were validated against the official Google Cloud CLI reference instead of local `--help` output.
