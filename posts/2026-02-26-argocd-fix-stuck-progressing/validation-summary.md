# Validation Summary: How to Fix ArgoCD Application Stuck in 'Progressing'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes Pod scheduling
- Kubernetes readiness probes
- Kubernetes PodDisruptionBudgets
- Argo CD Lua custom health checks
- Prometheus alerting

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The Deployment conditions JSONPath example used `{.status.conditions[*]}`, which emits separate objects rather than one valid JSON array for `python3 -m json.tool`. Changed it to `{.status.conditions}`.
- The PodDisruptionBudget section said a PDB can block old pods from being terminated during a rollout. Kubernetes documentation states workload resources such as Deployments and StatefulSets are not limited by PDBs during rolling updates. Updated the section to describe PDBs blocking evictions during node drains or maintenance instead.
- The Lua custom health check initialized `hs` as an empty table and could return without a `status` when `obj.status` was missing. Added a default `Progressing` status and message before inspecting `obj.status`.
- The force-resolution warning said all listed manual interventions cause Argo CD to show OutOfSync. Rollbacks and scaling can cause OutOfSync when live state diverges from Git, but deleting pods usually does not change desired state. Updated the warning accordingly.

## Review Notes
The post is technically relevant and the remaining commands and configuration examples align with the documented Argo CD and Kubernetes behavior. The `kubectl exec ... curl` example assumes the container image includes `curl`; in some minimal images, operators may need to use an available tool or a temporary debug container.
