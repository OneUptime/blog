# Validation Summary: How to Create GCP Logging Metrics in Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Cloud Logging (log-based metrics)
- Google Cloud Monitoring (alert policies)
- `hashicorp/google` Terraform provider (~> 5.0)
- Google Kubernetes Engine (GKE) log resource types
- GCP Audit Logs (`protoPayload` fields)

## Sources Consulted
- Terraform Registry: `google_logging_metric` resource — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_metric
- Terraform Registry: `google_monitoring_alert_policy` resource — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Google Cloud Logging — Logs-based metrics documentation
- Google Cloud Logging query language reference (filter syntax, `EXTRACT()` function, severity comparators)
- Google Cloud Monitoring metric naming conventions (`logging.googleapis.com/user/*`)
- gRPC status code reference (https://grpc.github.io/grpc/core/md_doc_statuscodes.html)

## Issues Found
- **Incorrect gRPC status code for authentication failures.** The `auth_failures` metric was named "authentication-failures" with description "Count of failed authentication attempts" but its filter used `protoPayload.status.code=7`, which is `PERMISSION_DENIED` — an authorization failure, not an authentication failure. The correct code for authentication failures is `16` (`UNAUTHENTICATED`). Updated the filter to use `protoPayload.status.code=16` so it matches the metric's stated intent.

## Review Notes
- All other Terraform syntax (`google_logging_metric` schema, `metric_descriptor`, nested `labels` blocks, `label_extractors`, `value_extractor`, `bucket_options.explicit_buckets.bounds`) verified against the official provider documentation.
- `metric_kind = "DELTA"` is correctly used throughout — this is the only supported kind for user-defined log-based metrics.
- The `metric_descriptor` block is technically optional for simple `INT64`/`DELTA` counter metrics, but including it explicitly (as the post does) is valid and self-documenting.
- The `EXTRACT()` extractor function and Cloud Logging filter operators (`>=` for severity, `:` for substring/contains, `=` for equality) are all valid.
- The alert policy uses the correct user-defined log-based metric path `logging.googleapis.com/user/<METRIC_NAME>` and valid implicit-AND filter syntax (whitespace between conditions).
- The alert policy filter uses `resource.type="global"`; this is appropriate when the underlying log entries don't carry a specific monitored-resource type, but readers should be aware that for metrics derived from logs of typed resources (e.g., `k8s_container`), the resource type in the alert filter must match the actual resource type of the source logs.
- Provider pin `~> 5.0` is consistent with sibling posts in the same series. Provider 6.x is current as of 2026-05; the resource schema for `google_logging_metric` is unchanged between 5.x and 6.x, so the examples remain valid under both.
