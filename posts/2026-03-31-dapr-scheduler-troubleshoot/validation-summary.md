# Validation Summary: How to Troubleshoot Dapr Scheduler Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr Scheduler service
- Dapr Jobs API (alpha)
- Dapr service invocation API
- Embedded etcd in Dapr Scheduler
- Kubernetes (StatefulSets, PVCs, NetworkPolicies)
- Helm (Dapr Helm chart)

## Sources Consulted
- Dapr Jobs API Reference — https://docs.dapr.io/reference/api/jobs_api/
- Dapr Scheduler Service Overview — https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Service Invocation API — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes Persisting Scheduler Data — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-persisting-scheduler/
- Dapr Helm Chart - Scheduler StatefulSet template (GitHub) — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_statefulset.yaml
- Dapr Helm Chart - Scheduler Service template (GitHub) — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_service.yaml
- Dapr Helm Chart - Scheduler values.yaml (GitHub) — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/values.yaml

## Issues Found

### 1. Incorrect StatefulSet and PVC names (HIGH severity)
- **What was wrong:** The post used `kubectl delete statefulset dapr-scheduler` and `kubectl delete pvc -n dapr-system -l app=dapr-scheduler`. The actual StatefulSet name is `dapr-scheduler-server` and the PVC label is `app=dapr-scheduler-server`.
- **What was changed:** Updated both commands to use `dapr-scheduler-server` instead of `dapr-scheduler`.
- **Why:** The Dapr Helm chart deploys the Scheduler as a StatefulSet named `dapr-scheduler-server`. Using the wrong name would cause the delete commands to silently fail, leaving the user unable to reset the corrupted Scheduler.

### 2. etcdctl not available in Scheduler container (MEDIUM severity)
- **What was wrong:** The post suggested running `kubectl exec ... dapr-scheduler-$i -- etcdctl ...` to check etcd status. The Scheduler container is built on `gcr.io/distroless/static:nonroot`, which contains only the scheduler binary — no shell, no `etcdctl`.
- **What was changed:** Replaced the `kubectl exec` approach with a port-forward approach: forward port 2379 from each Scheduler pod and run `etcdctl` locally. Also updated pod names from `dapr-scheduler-$i` to `dapr-scheduler-server-$i`.
- **Why:** The original command would fail with an exec error since the binary doesn't exist in the container. Port-forwarding is the standard way to interact with embedded etcd in distroless containers.

### 3. Misleading claim about missed job behavior (LOW severity)
- **What was wrong:** The post stated "Dapr does not replay missed jobs by default." This is misleading — Dapr has a staging queue mechanism that holds undelivered jobs and delivers them once a suitable sidecar becomes available.
- **What was changed:** Rewrote the paragraph to explain that Dapr queues undelivered jobs internally and attempts redelivery, but that multiple missed occurrences of recurring jobs during extended downtime may not all be replayed.
- **Why:** The original claim could lead users to believe no recovery mechanism exists, when in fact Dapr handles transient delivery failures automatically.

## Review Notes
- The Jobs API uses `v1.0-alpha1` which is correct as of the latest Dapr releases. The Scheduler control plane graduated to stable in Dapr 1.15, but the Jobs API itself remains alpha. This API version may change in future releases.
- The manual job invocation approach using the service invocation API (`/v1.0/invoke/`) is a valid workaround but depends on the app having a handler at the `/job/<job-name>` path, which is the default path Dapr Scheduler uses for job callbacks.
- The Scheduler's default retry behavior for failed job callbacks is 1-second intervals with up to 3 retries. This can be customized via failure policies (e.g., "constant" for continuous retries, "drop" to stop after first failure). The post could benefit from mentioning these options in a future update.
