# Validation Summary: How to Configure Pod Priority for Critical Workload Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes pod priority and preemption
- Kubernetes QoS classes and node-pressure eviction
- Kubernetes Deployments, StatefulSets, Jobs, and PodDisruptionBudgets
- kubectl
- kube-state-metrics / Prometheus
- Prometheus Operator PrometheusRule
- Kyverno admission policies

## Sources Consulted
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes Pod QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kyverno validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno match and exclude rules: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/

## Issues Found
- The post described critical workloads as if priority could make them "never" evicted. Updated the wording to reflect that priority reduces preemption and eviction risk but does not provide an absolute guarantee.
- Several Kubernetes workload examples were incomplete for current `apps/v1` APIs. Added required selectors, matching pod template labels, StatefulSet `serviceName` fields, and a Job `restartPolicy`.
- The preemption explanation said the preemptor pod schedules immediately. Updated it to note that preempted pods receive their graceful termination period, so scheduling can be delayed.
- The QoS eviction ordering was inaccurate. Replaced the strict BestEffort/Burstable/Guaranteed ordering with the documented kubelet ranking: whether usage exceeds requests, pod priority, then usage relative to requests, with QoS as an estimate rather than the direct ordering mechanism.
- The system-critical priority range was misstated as "above 2 billion." Updated it to the documented rule that user-created PriorityClass values must be less than or equal to 1 billion.
- The monitoring PromQL used `reason="Preempted"` and assumed `priority_class` existed on `kube_pod_status_reason`. Updated it to use `reason="PreemptionByScheduler"` and join with `kube_pod_info` for priority class labels.
- The Kyverno policy used older top-level matching/action style. Updated it to current documented `match.any` and `validate.failureAction: Enforce` form.
- The testing command used the removed `kubectl run --replicas` flag and did not set resource requests on the stress pods. Replaced it with a `kubectl apply` Deployment example that sets CPU requests, and corrected the `kubectl run --overrides` JSON to put resources on the container.
- The global default pitfall said priority 0 pods cannot preempt anything. Updated it to clarify that they cannot preempt equal-priority pods but can preempt pods with negative priority.

## Review Notes
`kubectl` was not installed in the local environment, so command validation was performed against the current official Kubernetes kubectl reference rather than local `kubectl --help` output. Fenced YAML blocks and inline JSON overrides were parsed locally after edits.
