# Validation Summary: How to Fix object has been modified Error in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux v2
- Kubernetes
- Kustomize Controller
- Helm Controller
- Server-Side Apply
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- Kubernetes admission webhooks

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes HorizontalPodAutoscaler Walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `flux get kustomizations` command reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux `flux logs` command reference: https://fluxcd.io/flux/cmd/flux_logs/

## Issues Found
- The post implied VPA commonly updates Deployment resources directly. Updated the wording to distinguish HPA scale updates from VPA behavior, which usually works through recommendations, admission, or eviction.
- The post stated that mutating admission webhooks can change the resource version between Flux's read and write operations. Revised this to say webhooks can mutate fields during create/apply, while follow-up updates by webhooks or controllers can contribute to ownership or resource version conflicts.
- The "Switch to Server-Side Apply" fix showed a Flux Kustomization snippet even though Flux v2 Kustomizations already use server-side apply. Replaced it with a resource-level `kustomize.toolkit.fluxcd.io/ssa: Merge` annotation example and clarified that `Merge` only preserves non-overlapping fields.
- The prevention text said to "use server-side apply" as if it were not already the Flux v2 default. Updated it to recommend tuning server-side apply behavior where needed.

## Review Notes
- The `flux` and `kubectl` binaries were not available in this workspace, so CLI checks were verified against the official Flux and Kubernetes command documentation instead of local `--help` output.
- `kubectl get vpa -A` depends on the VPA CRD being installed; if VPA is not installed, Kubernetes will report that the resource type is unknown.
