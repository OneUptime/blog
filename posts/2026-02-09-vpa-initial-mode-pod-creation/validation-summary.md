# Validation Summary: How to Use VPA in Initial Mode to Set Requests Only at Pod Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler
- Kubernetes Deployments and StatefulSets
- Kubernetes CronJobs
- kubectl
- jq
- Bash

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- VPA autoscaling.k8s.io/v1 Go API reference: https://pkg.go.dev/k8s.io/autoscaler/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1
- GKE Vertical Pod autoscaling concepts and API reference: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/

## Issues Found
- The post used `Auto` mode as the main eviction-based comparison mode and in the staging example. Kubernetes VPA now marks `Auto` as deprecated and recommends explicit modes such as `Recreate`, so references and the example were changed from `Auto` to `Recreate`.
- The introduction described `Auto` mode as continuously updating resources. Kubernetes documents VPA as a periodic controller, and the current explicit eviction-based mode is `Recreate`, so the wording was corrected.
- The gradual rollout script waited on all currently selected pods with `kubectl wait --for=condition=Ready pods -l ...`, which could return before the replacement pod was ready. The script now waits for the deleted pod to disappear and for the Deployment ready replica count to return to the desired value.
- The pod churn command labeled a creation timestamp column as `AGE`. The column was renamed to `CREATED` and the surrounding text was adjusted.
- The events command was labeled as checking restart reasons, but it filters creation and start events. The comment was corrected to match the command.

## Review Notes
The VPA manifests use the current stable `autoscaling.k8s.io/v1` API and valid `updatePolicy`, `targetRef`, and `resourcePolicy` fields. The CronJob manifest uses the current `batch/v1` API. The scheduled restart example assumes the referenced service account has RBAC permissions to restart the Deployment.
