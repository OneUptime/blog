# Validation Summary: How to Use kubectl rollout for Deployment Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Deployments
- StatefulSets
- DaemonSets
- ReplicaSets
- Prometheus / kube-state-metrics
- CI/CD shell scripting

## Sources Consulted
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout pause reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/
- Kubernetes kubectl rollout resume reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_resume/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/

## Issues Found
- The post recommended `kubectl --record` for recording rollout change causes. Kubernetes documents this flag as deprecated and notes it will be removed in a future release. I replaced the `--record` examples with the supported `kubernetes.io/change-cause` annotation approach and noted that the annotation should be set before changing the pod template so it is copied to the new revision.
- The `kubectl annotate` example could fail when updating an existing `kubernetes.io/change-cause` annotation. I added `--overwrite`, which is the documented flag for allowing annotation updates.
- The automated rollback script attempted to store the current revision with `tail -2 | head -1`, which selects the previous revision when multiple revisions are present. I changed it to parse the last numeric revision from `kubectl rollout history` and quoted shell variables in the related kubectl commands.
- The full `apps/v1` Deployment YAML examples omitted the required `.spec.selector` and `.spec.template` fields. I added matching selectors and pod templates so the examples are valid Kubernetes Deployment manifests.
- The restart section said `kubectl rollout restart` restarts pods without changing the spec. I tightened this to say it does not change container images or other application configuration, because the command restarts workloads by updating rollout-related pod template metadata.

## Review Notes
`kubectl` was not installed in the local environment, so CLI behavior was checked against the official generated kubectl reference and Kubernetes workload documentation. The Prometheus metric examples assume kube-state-metrics is installed and exposing the standard deployment metrics.
