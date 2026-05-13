# Validation Summary: Resolving HPA and Flux Replicas Conflict

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Horizontal Pod Autoscaler
- Kustomize patches
- Flux CD Kustomization
- kubectl
- Flux CLI

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The post described Flux `ignoreDifferences`, but the Flux Kustomization v1 API does not provide an `ignoreDifferences` field. I changed this section to use Flux Kustomization `.spec.patches`, which is documented and supports inline JSON6902 patches.
- The Flux example claimed `spec.force: false` and server-side apply would make Flux respect HPA ownership of `spec.replicas`. Flux `spec.force` only controls recreating resources when patching immutable fields fails, so I replaced that guidance with a warning that it is not a fix for replica conflicts.
- The Kustomize example used a strategic merge-style `replicas: null` patch. I changed it to an explicit JSON6902 `remove` operation so the rendered manifest clearly omits `/spec/replicas`.

## Review Notes
Kubernetes explicitly recommends omitting `.spec.replicas` when an HPA manages a Deployment, and notes that removing it from an already-applied manifest can briefly default the Deployment to 1 replica unless migration steps are followed. The post now accurately presents removing or patching out `spec.replicas` as the reliable GitOps-compatible solution.
