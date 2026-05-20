# Validation Summary: How to Handle Resource Quota During Deployment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes PriorityClass and preemption
- Kubernetes Vertical Pod Autoscaler
- kube-state-metrics
- Prometheus Operator PrometheusRule
- kubectl

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/

## Issues Found
- The temporary quota hook strategy did not mention that Argo CD can reapply the lower `ResourceQuota` during the same sync if the quota manifest is also managed by the application. Added a caveat that the temporary quota value must not be immediately reconciled away.
- The PriorityClass section implied that priority-based preemption could solve tight namespace quota. Kubernetes preemption happens in the scheduler after a pod has been admitted, while ResourceQuota is an admission check. Updated the text to clarify that PriorityClass helps with node-capacity scheduling, not bypassing ResourceQuota.
- The `batch-workload` PriorityClass used `preemptionPolicy: Never` but described the class as "can be preempted." `preemptionPolicy: Never` means pods in that class do not preempt lower-priority pods. Updated the description accordingly.
- The Argo CD retry section implied that retries directly work through Deployment surge pod quota failures. Updated the explanation to clarify that Argo CD retry helps failed sync operations, while Kubernetes handles pod creation for an already-applied Deployment.
- The Prometheus quota alert divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the differing `type` label, so PromQL vector matching would not produce the intended ratio. Updated both alert expressions to use `ignoring(type)`.
- The quota alert summaries did not include the `resource` label, even though `kube_resourcequota` reports separate series per resource. Updated the summaries to identify the quota resource that is near or at capacity.

## Review Notes
The ResourceQuota examples, rolling update `maxSurge` and `maxUnavailable` guidance, LimitRange fields, VPA `updateMode: "Off"` usage, Argo CD hook annotations, Argo CD retry syntax, `kubectl patch resourcequota` command form, and PrometheusRule structure are consistent with the consulted documentation. The temporary quota hook examples assume the hook service account has RBAC permission to patch ResourceQuota objects, which is operationally required but outside the manifest snippets shown.
