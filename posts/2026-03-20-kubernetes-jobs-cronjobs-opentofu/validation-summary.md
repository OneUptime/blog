# Validation Summary: How to Create Kubernetes Jobs and CronJobs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Jobs
- Kubernetes CronJobs
- OpenTofu
- HCL
- HashiCorp Kubernetes provider

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/apply/
- HashiCorp Kubernetes provider `kubernetes_job_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/job_v1.md
- HashiCorp Kubernetes provider `kubernetes_cron_job_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cron_job_v1.md
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job docs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Indexed Job docs: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes Downward API docs: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The Step 1 comment said `terraform apply` in an OpenTofu-focused post. I changed it to `tofu apply` to match the OpenTofu CLI.
- The Step 3 example manually defined `JOB_COMPLETION_INDEX` through the downward API even though Kubernetes automatically exposes the built-in `JOB_COMPLETION_INDEX` environment variable for Indexed Jobs. I removed the redundant env block and replaced it with a comment so the example matches the official Kubernetes behavior.

## Review Notes
- The `kubernetes_job_v1` and `kubernetes_cron_job_v1` resources, including `wait_for_completion`, `completion_mode`, `ttl_seconds_after_finished`, `concurrency_policy`, `starting_deadline_seconds`, and `timezone`, are current and documented in the provider schema.
- Kubernetes CronJob time zone support is documented as stable in Kubernetes v1.27 and later.
- Runtime validation with `tofu validate` was not performed because neither `tofu` nor `terraform` is installed in this environment.
