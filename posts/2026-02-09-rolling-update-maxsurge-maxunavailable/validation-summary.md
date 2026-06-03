# Validation Summary: How to Fine-Tune Rolling Update maxSurge and maxUnavailable Parameters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling update strategy
- PodDisruptionBudget
- kubectl rollout commands
- Prometheus alert rule configuration
- Python

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Deployments concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The conservative Deployment example described `maxUnavailable: 0` as never allowing downtime. Kubernetes only guarantees the rollout will not intentionally reduce available pods below the desired count; it does not guarantee zero downtime for all application, readiness, capacity, or failure scenarios. I changed the wording to say it does not reduce available pods during the rollout.
- The resource-constrained strategy said pods are replaced "in-place." Kubernetes Pods are replaced, not updated in place. I changed this to say old pods are terminated before replacements are created.
- The PodDisruptionBudget comments and best-practice text implied PDBs directly complement Deployment `maxUnavailable` during rolling updates. Kubernetes documentation states PDBs constrain voluntary evictions, while workload controllers such as Deployments are not limited by PDBs during rolling upgrades. I updated the wording to scope PDB protection to voluntary evictions such as node drains.
- The Python helper rounded minimum availability down and forced at least one unavailable pod for fast and medium rollouts, which could violate high minimum availability targets. I changed it to use `math.ceil` for the required available count and allow `maxUnavailable` to be 0 when required.

## Review Notes
The Kubernetes API snippets use current `apps/v1` Deployments and `policy/v1` PodDisruptionBudgets. The kubectl commands match the official generated kubectl references, but `kubectl` was not installed in the local environment, so command validation was performed against official Kubernetes documentation rather than local `--help` output.
