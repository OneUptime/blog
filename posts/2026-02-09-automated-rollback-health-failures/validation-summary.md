# Validation Summary: How to Build Automated Rollback Procedures Triggered by K8s Health Check

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes liveness, readiness, and startup probes
- kubectl rollout commands
- Kubernetes client-go
- Flagger canary analysis
- Argo Rollouts analysis
- Prometheus metrics queries

## Sources Consulted
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- client-go apps/v1 generated package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/apps/v1
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/

## Issues Found
- Several `apps/v1` Deployment examples omitted required `spec.selector` and matching `spec.template.metadata.labels`. Added selectors and labels to make the Kubernetes manifests valid.
- The web-app Deployment example included `deployment.kubernetes.io/revision` as a user-authored rollback setting. Removed it because this annotation is managed by the Deployment controller, not configured manually as rollback policy.
- The Go controller used the removed `DeploymentRollback` / `Rollback()` API surface. Replaced it with current `client-go` operations: list ReplicaSets, identify the previous revision from `deployment.kubernetes.io/revision`, copy that ReplicaSet template back to the Deployment, and update the Deployment.
- The controller RBAC note only mentioned watching deployments. Updated it to include get, list, watch, and update permissions for deployments, ReplicaSets, and pods.
- The Argo Rollouts Prometheus analysis example used `successCondition: result >= 0.95`. Changed it to `result[0] >= 0.95`, matching Argo Rollouts guidance that Prometheus query results are returned as a vector.
- The intentionally broken nginx Deployment used port `8080`, but the default nginx image serves HTTP on port `80`. Changed the readiness probe port to `80` so the readiness failure is caused by the nonexistent path as described.

## Review Notes
YAML snippets were parsed successfully after the fixes. Local `kubectl` and Go compilation checks could not be run because `kubectl`, `go`, and `ruby` are not installed in this workspace, so CLI and client-go details were verified against official references instead.
