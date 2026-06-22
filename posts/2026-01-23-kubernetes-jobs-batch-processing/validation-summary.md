# Validation Summary: How to Use Kubernetes Jobs for Batch Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes indexed Jobs
- Kubernetes pod failure policies
- Kubernetes TTL-after-finished cleanup
- kubectl
- Kubernetes Python client
- YAML
- jq

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes indexed Jobs task: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes pod failure policy task: https://kubernetes.io/docs/tasks/job/pod-failure-policy/
- Kubernetes TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Official Kubernetes Python client: https://github.com/kubernetes-client/python

## Issues Found
- The work-queue example incorrectly used `completionMode: Indexed`, an explicit `completions: null`, and `JOB_COMPLETION_INDEX`. Kubernetes work-queue Jobs must leave `.spec.completions` unset, while indexed Jobs require a fixed completion count. Changed the example to a normal parallel work-queue Job with `parallelism` and no indexed-job fields.
- The pod failure policy example described a `DisruptionTarget` condition rule as "Retry on OOM". `DisruptionTarget` is for pod disruptions and the `Ignore` action prevents those disruptions from counting toward the backoff limit. Updated the comment to "Ignore pod disruptions".
- The manual cleanup commands for completed and failed Jobs could match active Jobs. Replaced `status.successful` field-selector examples with `jq` filters that check the `Complete` or `Failed` Job conditions.
- The old-jobs cleanup command could include Jobs without `completionTime`. Added an explicit `completionTime != null` check and used `fromdateiso8601` for time comparison.
- The best-practice note said `backoffLimit` prevents infinite retries, but Kubernetes defaults `.spec.backoffLimit` to 6. Changed the wording to say it makes retry behavior explicit.
- The basic Job explanation said a Job completes when a pod succeeds, which was too narrow for multi-completion Jobs. Updated it to say the Job completes when the required pod completions succeed.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI validation was performed against official Kubernetes reference documentation instead of local `kubectl --help` output.
- The post uses `xargs -r`, which is appropriate for common GNU/Linux environments but is not portable to every Unix variant.
