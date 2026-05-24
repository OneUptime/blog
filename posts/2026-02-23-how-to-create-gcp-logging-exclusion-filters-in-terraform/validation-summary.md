# Validation Summary: How to Create GCP Logging Exclusion Filters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Cloud Logging (exclusion filters, log sinks, query language)
- Google Cloud Provider for Terraform (`hashicorp/google` ~> 5.0)
- BigQuery (as a log export destination)
- GKE / Kubernetes (as a log source)

## Sources Consulted
- [google_logging_project_exclusion (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_exclusion)
- [google_logging_folder_exclusion (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_folder_exclusion)
- [Cloud Logging Query Language — `sample()` function](https://cloud.google.com/logging/docs/view/logging-query-language)
- Cloud Logging exclusion documentation

## Issues Found
1. **Operator precedence in the health check filter.** The original filter `resource.type="http_load_balancer" AND httpRequest.requestUrl:"/health" OR httpRequest.requestUrl:"/healthz" OR httpRequest.requestUrl:"/ready"` would, due to AND binding tighter than OR, evaluate as `(http_load_balancer AND /health) OR /healthz OR /ready`. That means the `/healthz` and `/ready` clauses would match logs from any resource type, not just the load balancer. Fixed by wrapping the OR clauses in parentheses.

2. **Incorrect "Partial Exclusions (Sampling)" example.** The original code claimed to exclude 90% of matching logs by setting `disabled = false`, but the `disabled` argument on `google_logging_project_exclusion` only enables/disables the exclusion — it has no sampling semantics, and `false` is the default. As written, the exclusion would drop 100% of successful request logs. Sampling in Cloud Logging is implemented inside the filter via the built-in `sample(<field>, <fraction>)` function. Fixed by adding `AND sample(insertId, 0.9)` to the filter (matches ~90% of entries deterministically by `insertId`, so the exclusion drops 90% and keeps 10%) and updated the surrounding prose to explain the mechanism correctly.

## Review Notes
- The `google_logging_project_exclusion`, `google_logging_organization_exclusion`, `google_logging_folder_exclusion`, `google_logging_project_sink`, `google_bigquery_dataset`, and `google_bigquery_dataset_iam_member` resources used in the post all exist in the current `hashicorp/google` provider with the field names shown.
- The Cloud Logging filter syntax used elsewhere in the post (`severity = DEBUG`, `severity < WARNING`, `severity < INFO`, `resource.type=`, `resource.labels.namespace_name=`, `jsonPayload.level=`, `httpRequest.status>=`/`<`, `httpRequest.requestUrl:`) is all valid Cloud Logging query language.
- The "Export Before Exclude" pattern using `google_logging_project_sink` with `unique_writer_identity = true` and granting `roles/bigquery.dataEditor` to the sink's writer identity is the standard and correct approach.
- The post pins the provider to `~> 5.0`. Provider 6.x and 7.x are also available; the resources and arguments used here remain unchanged across those versions, so the example will continue to work, but readers may want a newer version pin for new clusters.
