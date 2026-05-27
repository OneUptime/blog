# Validation Summary: How to Set Up Cloud Run with Cloud CDN for Caching Static Assets at the Edge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud CDN
- Global external Application Load Balancer
- Serverless network endpoint groups
- Google Cloud CLI
- HTTP Cache-Control headers
- Flask

## Sources Consulted
- Google Cloud Load Balancing: Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud CDN: Change cache modes: https://docs.cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud CDN: Caching overview: https://cloud.google.com/cdn/docs/caching
- Google Cloud CDN: Customize cache keys: https://docs.cloud.google.com/cdn/docs/using-cache-keys
- Google Cloud CDN: Troubleshoot Cloud CDN: https://docs.cloud.google.com/cdn/docs/troubleshooting-steps
- Google Cloud CDN: Serve stale content: https://docs.cloud.google.com/cdn/docs/serving-stale-content
- Google Cloud SDK reference: gcloud compute backend-services create/update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create and https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference: gcloud compute url-maps invalidate-cdn-cache: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/invalidate-cdn-cache
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The backend service example used older `--cdn-policy-*` flag names. Updated the command to use the current `--cache-mode=USE_ORIGIN_HEADERS` flag.
- The backend service example set default and maximum TTLs while using `USE_ORIGIN_HEADERS`. Google Cloud documents that this mode requires valid origin cache headers and does not use a fallback default TTL, so the TTL flags were removed and the explanation was corrected.
- The forwarding rule examples omitted the `EXTERNAL_MANAGED` load balancing scheme used by the rest of the setup. Added `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM` to match the documented global external Application Load Balancer commands.
- The Flask example referenced `render_template`, `jsonify`, and `get_catalog()` without importing or defining them. Added the missing imports and a small placeholder `get_catalog()` function.
- The Flask app defined a custom `/static/<path:filename>` route while leaving Flask's default static route enabled. Set `static_folder=None` so the example route handles `/static` as shown.
- The `immutable` explanation incorrectly said it tells Cloud CDN the URL will never change. Cloud CDN documents `immutable` as having no effect on its cache behavior, so the text now scopes that behavior to browsers.
- The cache verification section implied `X-Cache-Status` is a default response header. Updated it to rely on `Age` for cache hits and note that cache status headers require custom response header configuration.
- The cache key examples used non-current query string cache key flag names. Updated them to `--cache-key-include-query-string` and `--no-cache-key-include-query-string`.

## Review Notes
The guide is technically sound after the fixes. Local `gcloud` was not installed in the review environment, so command validation was performed against current official Google Cloud CLI reference documentation instead of local `--help` output.
