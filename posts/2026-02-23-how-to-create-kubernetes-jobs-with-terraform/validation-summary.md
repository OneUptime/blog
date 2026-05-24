# Validation Summary: How to Create Kubernetes Jobs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- hashicorp/kubernetes Terraform provider (~> 2.25)
- Kubernetes Jobs (batch/v1)
- Kubernetes ServiceAccounts
- Kubernetes PersistentVolumeClaims / ConfigMaps (volume sources)
- GKE Workload Identity (annotation example)

## Sources Consulted
- hashicorp/kubernetes provider docs — `kubernetes_job` / `kubernetes_job_v1` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/job_v1
- hashicorp/kubernetes provider docs — `kubernetes_job`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/job.html
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Indexed Jobs (Kubernetes blog): https://kubernetes.io/blog/2021/04/19/introducing-indexed-jobs/
- Indexed Parallel Processing docs: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- HashiCorp blog — Wait Conditions in the Kubernetes Provider: https://www.hashicorp.com/en/blog/wait-conditions-in-the-kubernetes-provider-for-hashicorp-terraform
- GitHub issue #1494 (completion_mode added in provider v2.7.0): https://github.com/hashicorp/terraform-provider-kubernetes/issues/1494

## Issues Found
1. **Misleading comment about `backoff_limit` in the Parallel Batch Job example.** The comment said `Each pod can fail up to 3 times before the Job gives up` next to `backoff_limit = 6`. The numbers were inconsistent and the description was incorrect — `backoff_limit` is the total number of pod retry failures the Job tolerates across all attempts, not a per-pod retry count (per Kubernetes Job docs). Updated the comment to: `Total number of pod failures tolerated across the whole Job before it gives up`.

## Review Notes
- All other technical claims verified accurate against the hashicorp/kubernetes provider v2.25 and Kubernetes Job documentation:
  - `wait_for_completion`, `timeouts { create, update }`, `completion_mode = "Indexed"`, `completions`, `parallelism`, `backoff_limit`, `ttl_seconds_after_finished`, `active_deadline_seconds`, and `init_container` are all valid attributes.
  - `env { value_from { secret_key_ref { name, key } } }` syntax is correct.
  - `JOB_COMPLETION_INDEX` env var is correctly identified as auto-injected for Indexed completion mode.
  - `restart_policy` is correctly stated to support only `Never` and `OnFailure` for Jobs.
- `kubernetes_job` resource name still works in provider v2.25 (alongside `kubernetes_job_v1`). The `_v1` form is the newer canonical name and could be preferred in future revisions of the post, but `kubernetes_job` is not deprecated/removed.
- The pattern of including a version in the Job name to force replacement (Jobs are largely immutable) is accurate and idiomatic.
- The internal blog link to the CronJobs post follows the same dated path scheme used elsewhere in the blog; not verified to exist but plausible.
