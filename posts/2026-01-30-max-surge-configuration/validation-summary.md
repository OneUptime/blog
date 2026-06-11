# Validation Summary: How to Create Max Surge Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling updates
- `maxSurge` and `maxUnavailable`
- Kubernetes readiness and liveness probes
- Pod Disruption Budgets
- `kubectl`

## Sources Consulted
- Kubernetes Deployment concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes disruptions and Pod Disruption Budgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- `kubectl rollout history` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Several `apps/v1` Deployment examples omitted `spec.selector` and matching `spec.template.metadata.labels`. In the Kubernetes Deployment API, `selector` is required and must match the pod template labels. Added selectors and labels to the web frontend, worker pool, and API gateway examples.
- The initial rollout diagram described adding pods to a load balancer and implied surge-first behavior generally. Updated it to describe Service endpoints and clarified that the surge-first sequence applies with `maxUnavailable: 0`.
- The probe comment said probes are required for safe rolling updates. Kubernetes does not require liveness probes for rolling updates; readiness probes are the relevant mechanism for deciding when a pod is ready to receive traffic. Updated the comment to focus on readiness probes.
- The PDB section said PDBs control involuntary disruptions like node drains. Kubernetes documents node drains as voluntary disruptions, and PDBs limit voluntary disruptions that use the Eviction API. Corrected the explanation and wording around node operations.
- The event troubleshooting command sorted by `.lastTimestamp`, an older event field. Updated it to sort by `.metadata.creationTimestamp`, which is a stable metadata field supported by `kubectl get --sort-by`.

## Review Notes
The main `maxSurge` and `maxUnavailable` claims, defaults, percentage rounding behavior, and rollout examples were consistent with the Kubernetes Deployment documentation. `kubectl` was not installed in the local environment, so command verification was performed against the official Kubernetes kubectl reference instead of local `--help` output.
