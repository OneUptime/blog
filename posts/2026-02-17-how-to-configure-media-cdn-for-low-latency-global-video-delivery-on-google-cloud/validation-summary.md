# Validation Summary: How to Configure Media CDN for Low-Latency Global Video Delivery on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Media CDN
- Edge Cache origins, services, and keysets
- Cloud Storage origins
- Certificate Manager `EDGE_CACHE` certificates
- Signed URLs with Ed25519
- Cloud Monitoring and Cloud Logging
- Python
- gcloud CLI

## Sources Consulted
- Google Cloud Media CDN overview: https://docs.cloud.google.com/media-cdn/docs/overview
- Google Cloud Media CDN origin configuration: https://docs.cloud.google.com/media-cdn/docs/configure-origin
- Google Cloud Media CDN routing configuration: https://docs.cloud.google.com/media-cdn/docs/routing
- Google Cloud Media CDN signed requests: https://docs.cloud.google.com/media-cdn/docs/signed-requests
- Google Cloud Media CDN signature generation: https://docs.cloud.google.com/media-cdn/docs/generate-signatures
- Google Cloud Media CDN keysets: https://docs.cloud.google.com/media-cdn/docs/create-keyset
- Google Cloud Media CDN SSL/TLS certificates: https://docs.cloud.google.com/media-cdn/docs/configure-ssl-certificates
- Google Cloud Media CDN REST reference for EdgeCacheService: https://docs.cloud.google.com/media-cdn/docs/reference/rest/v1/projects.locations.edgeCacheServices
- Google Cloud Media CDN REST reference for EdgeCacheOrigin: https://docs.cloud.google.com/media-cdn/docs/reference/rest/v1/projects.locations.edgeCacheOrigins
- Google Cloud CLI reference for `gcloud edge-cache`: https://docs.cloud.google.com/sdk/gcloud/reference/edge-cache

## Issues Found
- The post used outdated `gcloud beta network-services edge-cache-*` command paths. Updated commands to the current `gcloud edge-cache origins|services|keysets` command group.
- The Cloud Storage origin used `storage.googleapis.com`, which is not the recommended bucket origin format for Media CDN. Updated examples to use `gs://your-video-bucket`.
- The route path templates used `/**/*.ext`, but Media CDN documents suffix matching as `/**.ext`. Updated manifest and segment match rules accordingly.
- The origin shielding example used `originOverrideAction.hostRewrite`, which is not origin shielding and is unnecessary for a Cloud Storage bucket origin. Replaced it with the documented `flexShielding.flexShieldingRegions` configuration.
- The service configuration did not attach an `EDGE_CACHE` scoped TLS certificate while the signed URL example used an HTTPS CDN hostname. Added `requireTls` and `edgeSslCertificates` placeholders, and added the certificate to the prerequisites.
- The signed URL key generation and Python signing example incorrectly used a random HMAC-SHA1 secret while describing Ed25519 signed URLs. Replaced it with Ed25519 key generation and an Ed25519 Python signing example using `cryptography`.
- The post claimed live streams need "sub-second CDN latency," which is too specific for a general Media CDN guide and not a guaranteed documented behavior. Reworded it to low CDN latency and fast cache fills.
- The optimization tips claimed Media CDN can prefetch the next live segment before the player requests it. Reworded this as cache warming for major live events.

## Review Notes
The post is technically relevant and now aligns with current Google Cloud Media CDN documentation. I could not validate commands with local `gcloud --help` because `gcloud` is not installed in this environment, so CLI validation was done against official Google Cloud CLI reference documentation.
