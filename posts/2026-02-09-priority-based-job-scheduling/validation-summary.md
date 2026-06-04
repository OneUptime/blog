# Validation Summary: How to Implement Priority-Based Job Scheduling Using PriorityClasses

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes Jobs and CronJobs
- Kubernetes scheduler priority and preemption
- Kubernetes ResourceQuota with PriorityClass scope selectors
- kubectl
- jq

## Sources Consulted
- Kubernetes API Reference: PriorityClass v1: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes Concepts: Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API Reference: Job v1: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes Concepts: Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Concepts: Resource Quotas, PriorityClass scope: https://kubernetes.io/docs/concepts/policy/resource-quotas/#resource-quota-per-priorityclass
- Kubernetes API Reference: ResourceQuota v1: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Concepts: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- Several `batch/v1` Job examples omitted `template.spec.restartPolicy`. Kubernetes Jobs only allow pod template restart policies of `Never` or `OnFailure`; omitting the field relies on the Pod default of `Always`, which is invalid for a Job. Added `restartPolicy: Never` to the affected Job examples.
- The preemption scenario text implied that lower-priority pods preempted by a high-priority Job would receive the high-priority Job's `terminationGracePeriodSeconds: 60`. In Kubernetes, each preempted victim pod receives its own configured graceful termination period. Updated the text to explain that `terminationGracePeriodSeconds` must be set on the jobs/pods that need checkpoint time before termination.

## Review Notes
- `PriorityClass` fields used in the post, including `value`, `globalDefault`, and `preemptionPolicy`, match the current `scheduling.k8s.io/v1` API. `preemptionPolicy` values `PreemptLowerPriority` and `Never` are valid.
- `ResourceQuota` examples using `scopeSelector.matchExpressions` with `scopeName: PriorityClass` are technically valid and align with the stable PriorityClass quota scope.
- The `kubectl get events --field-selector reason=Preempted` command is plausible because Kubernetes Events support `reason` as a field selector. Event availability may vary because Kubernetes events are short-lived and cluster-dependent.
- `kubectl` was not installed in the review workspace, so CLI command validation was performed against official Kubernetes documentation rather than local `kubectl --help` output.
