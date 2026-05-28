# Validation Summary: How to Configure CORS Policies on Google Cloud Storage Buckets

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Storage
- Cross-Origin Resource Sharing (CORS)
- Google Cloud CLI (`gcloud storage`)
- HTTP and browser preflight requests
- Signed URLs for browser uploads
- Terraform Google provider
- curl
- Mermaid sequence diagrams

## Sources Consulted
- Google Cloud Storage CORS overview and endpoint behavior: https://cloud.google.com/storage/docs/cross-origin
- Google Cloud Storage CORS setup and viewing guide: https://cloud.google.com/storage/docs/configuring-cors
- Google Cloud Storage CORS configuration examples: https://cloud.google.com/storage/docs/cors-configurations
- Google Cloud SDK reference for `gcloud storage buckets update`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Terraform Google provider `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The post listed `OPTIONS` as one of the HTTP methods to configure in the `method` field. Google Cloud documentation says `OPTIONS` is the browser preflight method and should not normally be specified as the actual request method; Cloud Storage XML API CORS support is documented for `DELETE`, `GET`, `HEAD`, `POST`, and `PUT`. I changed the field explanation to clarify that browsers use `OPTIONS` for preflight while the CORS rule should describe the actual request method.
- The direct-upload examples used `x-goog-meta-*` and stated that this wildcard allows reading custom metadata headers. I could not verify that `x-goog-meta-*` is supported as a wildcard pattern in GCS CORS `responseHeader` values. I changed the examples and explanation to list a concrete custom metadata header and instruct readers to list the specific metadata headers their app needs.
- The post said GCS evaluates multiple CORS rules in order and uses the first match. I did not find that selection-order behavior in the official Cloud Storage CORS documentation, so I narrowed the sentence to the documented capability: defining multiple rules for different origins and methods.
- The endpoint section said the XML API URL, JSON API URL, and bucket-hosted URL all respect the bucket CORS configuration, and described `https://BUCKET.storage.googleapis.com/OBJECT` as path-style. Google Cloud documentation says JSON API endpoints always allow CORS and return default CORS response headers regardless of bucket CORS configuration; bucket CORS rules control XML API endpoints. I corrected the JSON API behavior, renamed the bucket-hosted URL as XML API virtual-hosted style, and added the `storage.cloud.google.com` authenticated browser download caveat.

## Review Notes
The Google Cloud CLI commands and flags (`--cors-file`, `--clear-cors`) match current official documentation. The Terraform `google_storage_bucket` CORS block field names (`origin`, `method`, `response_header`, `max_age_seconds`) match the current Terraform Google provider documentation.
