# Validation Summary: How to Use Deployment Conditions to Monitor Rollout Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Deployment status conditions
- kubectl
- kube-state-metrics
- Prometheus / PromQL
- Grafana
- Kubernetes CronJobs
- Bash and jq

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kube-state-metrics Deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Bitnami kubectl container listing: https://bitnami.com/stack/kubectl/containers

## Issues Found
- Corrected the opening statement from saying a Deployment shows as "running" in kubectl to saying it shows up in kubectl output. Deployments expose READY, UP-TO-DATE, AVAILABLE, and related rollout fields rather than a simple "running" phase.
- Clarified `LastUpdateTime` as the time the condition was last updated, matching the Kubernetes API reference. `LastTransitionTime` remains the field for status transitions.
- Fixed the `Progressing` condition reasons list by adding `NewReplicaSetCreated` and changing the description of `ReplicaSetUpdated` from creating a ReplicaSet to scaling ReplicaSets during rollout.
- Added `kubectl rollout status deployment/api-server -n production --timeout=10m` to the CI/CD example so a rollout in progress is not reported as successful immediately after `kubectl apply`.
- Added the `reason` label to the `kube_deployment_status_condition` example to match current kube-state-metrics documentation.
- Changed the automated rollback example from an infinite loop inside a CronJob to a scheduled job that runs once per schedule. The original snippet would create overlapping CronJob runs because each job slept forever.
- Added `read -r` and `--overwrite` to the rollback script so annotation updates do not fail on later runs.
- Fixed Grafana PromQL examples that used `count(...)` on kube-state-metrics condition series. These metrics expose status series with values, so the examples now count active matches with `sum(... == 1)`.

## Review Notes
- The kube-state-metrics `reason` label is present in current deployment metric documentation. Older kube-state-metrics deployments may not expose that label, so readers on older versions may need to adjust the PromQL.
- The rollback CronJob example still assumes the service account has appropriate RBAC permissions and that the selected image includes the required tools used by the script.
