# Validation Summary: How to Create GCP Cloud CDN with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (>= 1.0)
- Google Cloud Platform (GCP)
- Google Cloud CDN
- Google Cloud Storage
- Google Cloud Load Balancing (Backend Bucket, URL Map, Target HTTPS Proxy, Global Forwarding Rule, Global Address)
- Google-managed SSL certificates
- `hashicorp/google` Terraform provider (~> 5.0)
- `gcloud` CLI

## Sources Consulted
- Terraform `google_compute_backend_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_bucket
- Terraform `google_storage_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform `google_compute_url_map` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map
- Terraform `google_compute_managed_ssl_certificate` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate
- Cloud CDN monitoring docs: https://cloud.google.com/cdn/docs/cdn-logging-monitoring
- Cloud Load Balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- `gcloud compute url-maps invalidate-cdn-cache` reference

## Issues Found
- **Incorrect Cloud Monitoring metric names**: The post claimed Google Cloud provides CDN-specific metrics named `cdn/hit_count`, `cdn/miss_count`, and `cdn/fill_bytes`. These metric names do not exist in Cloud Monitoring. Cloud CDN metrics are actually exposed through Cloud Load Balancing under the `loadbalancing.googleapis.com/https/*` namespace, and cache status is broken out via the `cache_result` label (HIT, MISS, REVALIDATED, DISABLED, etc.). Updated the Monitoring section to reference the real metrics: `loadbalancing.googleapis.com/https/request_count`, `loadbalancing.googleapis.com/https/response_bytes_count`, and `loadbalancing.googleapis.com/https/backend_request_count`, with a note on filtering by `cache_result`.

## Review Notes
- All Terraform resource names, argument names, and supported values were verified against the current `hashicorp/google` provider 5.x documentation. The `cdn_policy` fields (`default_ttl`, `max_ttl`, `client_ttl`, `cache_mode = "CACHE_ALL_STATIC"`, `serve_while_stale`, `negative_caching`, `negative_caching_policy` with code 404) are all valid.
- `default_url_redirect.redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"` is a valid value.
- The `cors` block on `google_storage_bucket` uses the correct field names (`origin`, `method`, `response_header`, `max_age_seconds`).
- The `gcloud compute url-maps invalidate-cdn-cache` command and `--path` flag are correct.
- The 10–15 minute provisioning time for Google-managed SSL certificates is a reasonable expectation; in practice it can take up to ~60 minutes depending on DNS propagation, but the wording ("can take") is fine.
- The example uses a publicly-readable storage bucket (`allUsers` granted `roles/storage.objectViewer`), which is appropriate for a static CDN origin but worth being mindful of in production for any non-public assets.
