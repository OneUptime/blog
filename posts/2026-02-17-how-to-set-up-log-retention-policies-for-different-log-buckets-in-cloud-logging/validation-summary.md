# Validation Summary: How to Set Up Log Retention Policies for Different Log Buckets in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging log buckets
- Cloud Logging sinks and exclusion filters
- Google Cloud CLI (`gcloud logging`)
- Terraform Google provider

## Sources Consulted
- Google Cloud Logging routing overview: https://cloud.google.com/logging/docs/routing/overview
- Google Cloud Logging buckets guide: https://cloud.google.com/logging/docs/buckets
- Google Cloud Logging quotas and retention periods: https://cloud.google.com/logging/quotas
- Google Cloud Logging locations and regional storage: https://cloud.google.com/logging/docs/region-support
- Google Cloud SDK reference for `gcloud logging buckets create`: https://cloud.google.com/sdk/gcloud/reference/logging/buckets/create
- Google Cloud SDK reference for `gcloud logging buckets update`: https://cloud.google.com/sdk/gcloud/reference/logging/buckets/update
- Google Cloud SDK reference for `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK reference for `gcloud logging sinks update`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- Terraform Google provider documentation for `google_logging_project_bucket_config`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_bucket_config
- Terraform Google provider documentation for `google_logging_project_sink`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink
- Terraform Google provider documentation for `google_logging_project_exclusion`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_exclusion

## Issues Found
- The `_Default` bucket description said it stores everything that is not routed elsewhere. Cloud Logging sinks evaluate independently, so custom sinks do not automatically prevent matching logs from also being stored by `_Default`. Updated the description to say `_Default` stores all log entries except those routed by `_Required`, unless exclusions or sink changes are applied.
- The sink setup section said the examples route logs based on severity and resource type, but the examples use severity and log name filters. Updated the wording to match the commands.
- The retention-shortening warning said older logs are immediately deleted and cannot be recovered. Google Cloud documents a 7-day grace period where expired logs are not queryable or viewable but access can be restored by extending retention. Updated the warning accordingly.
- The cost section said storage beyond the default retention period of each bucket incurs additional costs. Google Cloud documents retention costs for logs retained longer than the default retention period of `_Default` and user-defined buckets. Updated the wording to avoid implying the same rule applies to `_Required`.

## Review Notes
The `gcloud` command forms, sink destination format, retention range, built-in bucket retention values, exclusion filter usage, and Terraform resource names/fields were verified against official Google Cloud and HashiCorp documentation. The local environment did not have `gcloud` installed, so CLI verification used official Google Cloud SDK reference documentation rather than local `--help` output.
