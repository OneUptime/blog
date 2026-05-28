# Validation Summary: How to Configure Backend Buckets with Cloud Storage Behind a GCP Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- Google Cloud Load Balancing
- Backend buckets
- Cloud CDN
- Google Cloud CLI
- URL maps
- Google-managed SSL certificates

## Sources Consulted
- Google Cloud SDK documentation: `gcloud compute backend-buckets create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/create
- Google Cloud SDK documentation: `gcloud compute backend-buckets update` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/update
- Google Cloud SDK documentation: `gcloud compute url-maps create` - https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/create
- Google Cloud SDK documentation: `gcloud compute url-maps add-path-matcher` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- Google Cloud Load Balancing URL maps overview - https://cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud Storage static website hosting documentation - https://docs.cloud.google.com/storage/docs/hosting-static-website
- Google-managed SSL certificate documentation - https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Cloud CDN cache modes documentation - https://docs.cloud.google.com/cdn/docs/using-cache-modes
- Cloud CDN pricing documentation - https://cloud.google.com/cdn/pricing
- Cloud Storage pricing documentation - https://cloud.google.com/storage/pricing

## Issues Found
- The `gcloud compute backend-buckets update` custom header examples used the incorrect plural flag `--custom-response-headers`. Changed them to the documented singular repeatable flag `--custom-response-header`.
- The URL map path matcher example did not attach the new path matcher to a host rule. Added `--existing-host=example.com` so the example follows the documented requirement that a path matcher be referenced by a host rule.
- The HTTPS target proxy example omitted `--global` while the surrounding resources are global. Added `--global` for consistency with the global URL map, certificate, address, and forwarding rule.
- The SPA section said all routes would serve `index.html`, but the provided URL map uses `defaultUrlRedirect`, which redirects unmatched routes to `/index.html`. Updated the wording and comment to describe the actual behavior.
- The compression explanation mentioned only gzip. Updated it to reflect the documented behavior that `AUTOMATIC` compression can use Brotli or gzip based on the client's `Accept-Encoding` header.
- The mixed architecture diagram placed Cloud CDN after the backend bucket. Updated the diagram so `/static/*` traffic reaches the Cloud CDN cache before cache misses go to the backend bucket and Cloud Storage origin.
- The cost comparison used overly specific and partially outdated pricing wording. Updated it to describe current tiered pricing more accurately and mention cache lookup and cache fill charges.

## Review Notes
The post is technically relevant and validated after the corrections above. Pricing remains inherently time-sensitive and should be checked against the official Google Cloud pricing pages before publishing or using the estimates for planning.
