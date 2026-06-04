# Validation Summary: How to Set Container Restart Policies to Always, OnFailure, and Never

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes restartPolicy
- Kubernetes Jobs and CronJobs
- Kubernetes Deployments, StatefulSets, and DaemonSets
- Kubernetes liveness probes
- kubectl troubleshooting commands
- Prometheus restart metrics

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The batch Job example placed `backoffLimit` under `spec.template.spec`, which is a Pod spec location. Moved it to `spec.backoffLimit`, the correct Job spec field.
- The post stated that the pod restart policy applies to all containers in a pod. Updated this to account for Kubernetes-native sidecar containers, which are declared under `initContainers` and use container-level `restartPolicy: Always`.
- The comparison table said `Always` restarts immediately for all exits. Updated failure and OOM cases to mention the backoff delay, matching Kubernetes' exponential restart backoff behavior.
- The init container section described all init containers as sharing the pod restart policy. Qualified this as regular init containers and added the sidecar-container caveat.

## Review Notes
- `kubectl` is not installed in the local environment, so CLI behavior could not be checked with local `kubectl --help` or `kubectl explain`. Commands were reviewed against Kubernetes documentation and standard kubectl usage.
- Kubernetes v1.35 includes beta support for individual container restart policies and restart rules. The post focuses on pod-level restart policies, and the sidecar caveat now prevents the broadest misleading statement.
