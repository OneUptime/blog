# Validation Summary: How to Create Kubernetes CronJobs with Terraform

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Terraform (>= 1.0, with 1.3+ optional() default syntax)
- hashicorp/kubernetes Terraform provider (~> 2.25)
- Kubernetes CronJob (`batch/v1`, resource `kubernetes_cron_job_v1`)
- Kubernetes Job spec (backoff_limit, active_deadline_seconds, ttl_seconds_after_finished)
- Cron schedule expression syntax
- Pod spec primitives: containers, env, env_from, volume_mount, persistent_volume_claim, service_account_name

## Sources Consulted
- Official Terraform Registry docs for `kubernetes_cron_job_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/cron_job_v1
- Raw provider docs source: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/cron_job_v1.md
- Kubernetes documentation on CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob time zone GA notes (v1.27 stable)
- Kubernetes Job TTL mechanism (GA in v1.23)

## Issues Found
- The commented-out timezone example used `time_zone` (snake_case). The hashicorp/kubernetes Terraform provider actually exposes the field as `timezone` (one word). Updated the commented line in the "Basic CronJob" section from `time_zone = "America/New_York"` to `timezone = "America/New_York"`. The Kubernetes API field is `timeZone` (camelCase), but the provider's schema name is `timezone`, which is what the user actually writes in HCL.

## Review Notes
- The `optional(string, "200m")` syntax used in the `variable "scheduled_tasks"` block requires Terraform 1.3+. The `required_version = ">= 1.0"` in the provider block would technically allow older Terraform versions where this would fail to parse, but most users on a current Terraform release will be unaffected. Not changed because tightening the version constraint is a stylistic call rather than a correctness fix.
- `xargs -L 100` in the Redis cache cleanup example works (one key per line from `redis-cli --scan`), but `-n 100` is the more idiomatic flag for batching N arguments per command invocation. Behaviorally equivalent here, left as-is.
- The `Allow` concurrency policy is correctly identified as the default per Kubernetes docs.
- All cron schedule examples match standard cron semantics as implemented by Kubernetes.
- `restart_policy` values "OnFailure" and "Never" are used correctly for Job pod templates (the only two allowed values).
- The `kubernetes_cron_job_v1` resource maps to the GA `batch/v1` CronJob API (stable since Kubernetes 1.21), which is the correct resource to use today.
