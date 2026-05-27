# Validation Summary: How to Use Terraform to Configure Cloud CDN with a Cloud Storage Bucket Origin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud CDN
- Google Cloud Storage backend buckets
- Google Cloud external Application Load Balancing
- Terraform Google provider
- Cloud Functions 2nd gen
- Eventarc Cloud Storage triggers
- Google Cloud CLI
- Python Google Cloud Compute client

## Sources Consulted
- Google Cloud CDN backend bucket setup documentation: https://cloud.google.com/cdn/docs/setting-up-cdn-with-bucket
- Google Cloud CDN signed URLs documentation: https://cloud.google.com/cdn/docs/using-signed-urls
- Google Cloud CDN cache invalidation documentation: https://cloud.google.com/cdn/docs/invalidating-cached-content
- Google Cloud SDK reference for `gcloud compute url-maps invalidate-cdn-cache`: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/invalidate-cdn-cache
- Google Cloud Compute Engine REST reference for `urlMaps.invalidateCache`: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps/invalidateCache
- Google Cloud Python Compute client reference for `UrlMapsClient`: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.url_maps.UrlMapsClient
- Terraform Google provider `google_compute_backend_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_bucket
- Terraform Google provider `google_compute_backend_bucket_signed_url_key` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_bucket_signed_url_key
- Terraform Google provider `google_compute_url_map` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map
- Terraform Google provider `google_compute_global_forwarding_rule` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Terraform Google provider `google_cloudfunctions2_function` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The URL map path-specific cache override used `route_action { cdn_policy { ... } }`, which is not the current Terraform schema for URL map route actions. Changed it to `route_action { cache_policy { ... } }` and converted TTL values to duration blocks with `seconds`.
- The path-specific URL map cache policy requires a global external Application Load Balancer scheme. Added `load_balancing_scheme = "EXTERNAL_MANAGED"` to the global forwarding rule.
- The signed URL section implied signed URLs would protect content even when the bucket was public. Clarified that protected Cloud Storage backends must not grant public read access, and that the Cloud CDN fill service account needs object viewer access.
- The Python signed URL example stripped existing query parameters before signing. Updated it to preserve the original URL and append signed URL parameters with `?` or `&` as appropriate.
- The automated invalidation text referred to a Cloud Build trigger, but the Terraform config creates a Cloud Functions 2nd gen Eventarc trigger. Updated the wording to Cloud Function.
- The Cloud Functions 2nd gen event trigger omitted the trigger service account. Added `service_account_email` to match the documented Eventarc trigger configuration pattern.

## Review Notes
The Terraform snippets still assume the function source archive resources already exist (`google_storage_bucket.functions_source` and `google_storage_bucket_object.invalidator_source`). That is acceptable for a focused tutorial snippet, but a full copy-paste deployment would need those packaging resources and Cloud Functions build/runtime dependency files.
