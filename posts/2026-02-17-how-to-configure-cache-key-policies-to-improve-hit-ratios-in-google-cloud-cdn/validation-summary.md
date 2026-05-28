# Validation Summary: How to Configure Cache Key Policies to Improve Hit Ratios in Google Cloud CDN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud CLI (`gcloud`)
- Google Cloud Load Balancing backend services
- Cloud Logging
- Cloud Monitoring
- Terraform Google provider

## Sources Consulted
- Google Cloud CDN cache key documentation: https://docs.cloud.google.com/cdn/docs/using-cache-keys
- Google Cloud CDN caching overview: https://docs.cloud.google.com/cdn/docs/caching
- Google Cloud CDN logs and metrics documentation: https://docs.cloud.google.com/cdn/docs/logging
- Google Cloud CLI reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Terraform Google provider `google_compute_backend_service` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The `gcloud` examples used `--cache-key-include-http-headers`, but the current Google Cloud CLI flag is singular: `--cache-key-include-http-header`. Updated both affected examples.
- The `gcloud` examples used `--cache-key-include-named-cookies`, but the current Google Cloud CLI flag is singular: `--cache-key-include-named-cookie`. Updated both affected examples.
- The Terraform section described the snippet as a "complete Terraform setup", but it references resources not defined in the snippet. Changed the wording to "example Terraform backend service" to avoid implying it is standalone.
- The Cloud Logging example was labeled as querying cache hit/miss metrics, but the filter only returns `response_from_cache` hits. Updated the comment to say it queries recent cache hits.

## Review Notes
- The post focuses on backend service examples. Cloud CDN backend buckets have different default cache-key behavior for protocol, host, and query parameters, so future revisions could call out that scope explicitly.
- The post's `Accept-Encoding` discussion is directionally correct: Cloud CDN does not allow `Accept-Encoding` as a configured cache-key header, but handles compressed responses through its built-in behavior and `Vary: Accept-Encoding` support.
