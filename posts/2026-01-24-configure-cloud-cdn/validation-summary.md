# Validation Summary: How to Configure Cloud CDN

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud Load Balancing
- Google Cloud CLI (`gcloud`)
- Cloud Logging and Cloud Monitoring
- Terraform `google_compute_backend_service`
- Python with `google-cloud-compute`
- Flask
- Express.js
- HTTP caching headers and signed URLs

## Sources Consulted
- Google Cloud CDN caching overview: https://docs.cloud.google.com/cdn/docs/caching
- Google Cloud CDN cache key customization: https://docs.cloud.google.com/cdn/docs/using-cache-keys
- Google Cloud CDN cache invalidation: https://docs.cloud.google.com/cdn/docs/invalidating-cached-content
- Google Cloud CDN signed URLs: https://docs.cloud.google.com/cdn/docs/using-signed-urls
- Google Cloud CDN logs and metrics for caching: https://docs.cloud.google.com/cdn/docs/logging
- Google Cloud CDN with managed instance group backends: https://docs.cloud.google.com/cdn/docs/setting-up-cdn-with-mig
- Google Cloud CDN with Cloud Storage backend buckets: https://docs.cloud.google.com/cdn/docs/setting-up-cdn-with-bucket
- Google Cloud SDK backend bucket create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/create
- Terraform Google provider `google_compute_backend_service` documentation: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_backend_service.html.markdown

## Issues Found
- The prerequisites section said Cloud CDN requires a Cloud Load Balancer with a backend service and implied Cloud Storage buckets can be added with `backend-services add-backend`. Cloud Storage origins use backend buckets, not backend service backends. Updated the wording and added the correct `gcloud compute backend-buckets create --gcs-bucket-name ... --enable-cdn` example.
- The cache invalidation status command used `gcloud compute operations list --filter="operationType=invalidateCache"`, which is not the documented way to inspect Cloud CDN invalidation status. Replaced it with the documented Cloud Logging query for `protoPayload.methodName="v1.compute.urlMaps.invalidateCache"`.
- The Python invalidation example claimed batch invalidation with up to 50 paths per request and sent `None` as the path for multi-path batches. Cloud CDN path invalidation accepts one path pattern per request. Updated the loop to submit one invalidation request per changed path and removed the invalid `host: "*"` field.
- The Cloud Logging example filtered and formatted `jsonPayload.cacheHit`, but Cloud CDN cache hit status is recorded under `httpRequest.cacheHit`. Updated the query and output format to use `httpRequest.cacheHit` and include `jsonPayload.statusDetails`.
- The debugging section listed `X-Cache-Status` as a default Cloud CDN response header. Cloud CDN does not emit that header by default. Updated the guidance to use `Age` and `Cache-Control`, and noted that cache status headers require configured custom response headers.
- The dynamic-content example said `Vary: Authorization` creates a different cache per auth token. In Cloud CDN, unsupported `Vary` values prevent shared caching unless request headers are explicitly part of the cache key. Updated the comment to say it prevents shared caches from reusing authorization-specific responses.

## Review Notes
- `gcloud` is not installed in this workspace, so CLI validation was performed against current official Google Cloud documentation instead of local `--help` output.
- The Flask and Express snippets are illustrative and reference application-specific helper functions such as `get_static_data()` and `getUserData()`. Their cache-header usage is technically sound, but the snippets are not standalone runnable applications.
