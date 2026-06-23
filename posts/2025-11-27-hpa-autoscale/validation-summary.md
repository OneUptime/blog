# Validation Summary: How to Autoscale Deployments with the Horizontal Pod Autoscaler

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA), `autoscaling/v2` API
- Kubernetes metrics-server
- Kubernetes Deployments and resource requests/limits
- `kubectl` (top, get, apply, run, describe)
- PodDisruptionBudgets (referenced)

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler docs — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- HPA Walkthrough — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HPA scaling behavior / `behavior` field — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- metrics-server project — https://github.com/kubernetes-sigs/metrics-server
- Kubernetes API reference for `autoscaling/v2` HorizontalPodAutoscaler

## Issues Found
- **Troubleshooting bullet (Section 7) — incorrect behavior without CPU requests.** The original text stated "no requests means utilization is always 0%." This is wrong: when a container has no CPU request, the HPA cannot calculate a utilization percentage at all. The `TARGETS` column reports `<unknown>` and the HPA will not scale (it does not treat it as 0%). Updated the bullet to: "no requests means utilization can't be computed, so `TARGETS` shows `<unknown>` and the HPA won't scale."

## Review Notes
- The `autoscaling/v2` API version is correct and stable (GA since Kubernetes 1.23).
- The `behavior` block "Kubernetes 1.18+" note is accurate (introduced in `autoscaling/v2beta2` in 1.18; carried into stable `v2`).
- Default scale-down stabilization window of 300s (5 minutes) is correct.
- metrics-server install URL (`releases/latest/download/components.yaml`) is correct.
- Multiple-metrics example correctly uses `AverageValue` for memory and `Utilization` for CPU; HPA scales on whichever metric demands the most replicas — accurate.
- Minor caveat (not changed): the claim "HPAs cannot scale below PDB `minAvailable`" is an oversimplification. A Deployment scale-down deletes Pods directly via the controller rather than through the eviction API, so a PDB does not strictly block HPA scale-down. The advice to keep PDB and replica constraints aligned is still good practice, so the bullet was left intact.
