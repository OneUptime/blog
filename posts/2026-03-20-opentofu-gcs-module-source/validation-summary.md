# Validation Summary: Using GCS as a Module Source in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and Terraform — same module source semantics)
- Google Cloud Storage (GCS)
- go-getter (the underlying URL fetcher used by OpenTofu/Terraform)
- Google Cloud SDK (`gcloud`, `gsutil`)
- Terraform Google provider (`google_storage_bucket`, `google_storage_bucket_iam_member`)
- Application Default Credentials (ADC) and `GOOGLE_APPLICATION_CREDENTIALS`

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/#gcs-bucket
- Terraform module sources documentation: https://developer.hashicorp.com/terraform/language/modules/sources#gcs-bucket
- go-getter GCS getter source: https://github.com/hashicorp/go-getter/blob/main/get_gcs.go
- go-getter GCS detector source: https://github.com/hashicorp/go-getter/blob/main/detect_gcs.go
- Google Cloud Storage IAM roles: https://cloud.google.com/storage/docs/access-control/iam-roles
- Terraform Google provider `google_storage_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Application Default Credentials docs: https://cloud.google.com/docs/authentication/application-default-credentials

## Issues Found

1. **Incorrect GCS module source URL in the first example.**
   The post used `gcs::https://www.googleapis.com/storage/v1/b/my-modules/o/gke-v1.5.0.zip`, which mistakenly mixes the GCS JSON API resource-path format (`/b/{bucket}/o/{object}`) with the go-getter path layout. go-getter's `parseURL` in `get_gcs.go` splits the path with `SplitN(..., "/", 5)` and expects the bucket at index 3 and the object at index 4 — meaning the supported format is `gcs::https://www.googleapis.com/storage/v1/{BUCKET}/{OBJECT_PATH}`. With the original URL, the parser would treat the literal string `b` as the bucket name and the request would fail.
   **Fix:** Changed the source to `gcs::https://www.googleapis.com/storage/v1/my-modules/gke-v1.5.0.zip`.

2. **Incorrect "Alternative URL Format" example.**
   The post used `gcs::https://storage.googleapis.com/my-modules/modules/gke-v1.5.0.tar.gz`. While the host `storage.googleapis.com` does match go-getter's `*.googleapis.com` host check, the URL path `/my-modules/modules/gke-v1.5.0.tar.gz` only splits into 4 parts, but `parseURL` requires exactly 5, so this format would fail with "URL is not a valid GCS URL".
   **Fix:** Changed the source to `gcs::https://www.googleapis.com/storage/v1/my-modules/modules/gke-v1.5.0.tar.gz`, which is the documented and supported format and still demonstrates a `tar.gz` archive at a nested path.

3. **Misleading comment about `gs://` notation.**
   The comment "Using gs:// notation (automatically converted)" is incorrect — go-getter does not register a `gs://` scheme and its `GCSDetector` only matches sources containing `.googleapis.com/`. There is no automatic conversion of `gs://` URLs.
   **Fix:** Replaced the comment with "Tar.gz archives and nested object paths are also supported", which accurately describes what the alternative example demonstrates.

## Review Notes
- The Terraform Google provider resource names (`google_storage_bucket`, `google_storage_bucket_iam_member`), arguments (`force_destroy`, `versioning { enabled }`, `uniform_bucket_level_access`, `location`), and IAM role (`roles/storage.objectViewer`) are all current and correct.
- Authentication guidance (`gcloud auth application-default login`, `GOOGLE_APPLICATION_CREDENTIALS`, and instance/workload identity on GCE/GKE) is accurate.
- The `gsutil cp` command in the publishing script works, but Google now recommends `gcloud storage cp` as the modern replacement for `gsutil`. Both still function; this is a stylistic/forward-looking note rather than a correctness issue.
- The `gcs::` prefix is technically optional when the host is `www.googleapis.com` because `GCSDetector` will auto-prepend it, but the OpenTofu docs always show it explicitly, so keeping it is best practice and matches the documentation.
