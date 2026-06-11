# Validation Summary: How to Implement Deployment Progress Deadline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rollout commands
- Kubernetes readiness probes
- PodDisruptionBudget
- kube-state-metrics
- Prometheus Operator PrometheusRule
- PromQL

## Sources Consulted
- Kubernetes Deployment concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes PodDisruptionBudget task guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- kube-state-metrics Deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Prometheus Operator PrometheusRule CRD: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml

## Issues Found
- The example Deployment condition used `reason: ProgressDeadlineExceeded` with the message `"Deployment does not have minimum availability"`. That message describes availability, not the Progressing timeout condition. Updated it to a timed-out ReplicaSet progress message.
- The critical Prometheus alert selected any `Progressing` condition with `status="false"`. kube-state-metrics exposes a `reason` label, so the alert now filters `reason="ProgressDeadlineExceeded"` to match the alert name and description.
- The slow-rollout alert used `time() - kube_deployment_status_observed_generation{} > 300`, but `observed_generation` is a generation counter, not a timestamp. It also referenced `kube_deployment_status_ready_replicas`, while kube-state-metrics exposes `kube_deployment_status_replicas_ready`. Replaced the expression with the correct replica readiness metric and used the Prometheus `for` duration to express "taking longer than expected."
- The image verification example used `kubectl run ... --dry-run=server`, which validates admission without creating a Pod and therefore does not prove the image can be pulled. Replaced it with a temporary Pod, `kubectl wait`, and cleanup.

## Review Notes
Kubernetes reports `ProgressDeadlineExceeded` but does not roll back stalled Deployments by itself; the post correctly implements rollback in the CI/CD script. `kubectl` was not installed locally, so CLI flags were checked against the official Kubernetes generated command reference instead of local help output.
