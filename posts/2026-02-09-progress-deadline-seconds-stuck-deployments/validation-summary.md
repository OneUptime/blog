# Validation Summary: How to Use progressDeadlineSeconds to Detect Stuck Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Deployment status conditions
- kubectl rollout commands
- Kubernetes readiness and liveness probes
- Kubernetes CronJobs and RBAC
- Prometheus alerting
- kube-state-metrics
- Bash deployment automation

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Deployments concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post implied that omitting `progressDeadlineSeconds` means Kubernetes never reports rollout failure. Kubernetes defaults this field to 600 seconds, and the controller reports `ProgressDeadlineExceeded` while continuing reconciliation. Updated the wording to focus on checking the deadline condition and acting on it.
- The post described the deadline as if the rollout must fully complete within the configured number of seconds. Kubernetes defines the field as the maximum time for a Deployment to make progress before it is considered failed. Updated the explanation and edge case wording to say "make progress" rather than "complete."
- The timeout guidance omitted the API constraint that `progressDeadlineSeconds` must be greater than `minReadySeconds` when specified. Added that requirement where timeout selection is discussed.
- The automatic rollback CronJob example used an infinite loop even though the CronJob already runs every 5 minutes. Updated the script to perform one check per job run.
- The automatic rollback CronJob referenced a `deployment-monitor` service account without defining the service account or permissions. Added minimal ServiceAccount, ClusterRole, and ClusterRoleBinding manifests so the example can list deployments and patch them for `kubectl rollout undo`.
- The automatic rollback CronJob used `jq` while running a kubectl-focused container image. Replaced the JSON query with a `kubectl` Go template so the example does not depend on an extra binary being present.

## Review Notes
The Prometheus alert relies on kube-state-metrics exposing Deployment status conditions as metrics. Recent kube-state-metrics versions include the `reason` label for `kube_deployment_status_condition`; older installations may need a query adjusted to the labels they expose.
