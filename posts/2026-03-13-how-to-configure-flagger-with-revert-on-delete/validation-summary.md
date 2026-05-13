# Validation Summary: How to Configure Flagger with Revert on Delete

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Kubernetes Deployments and Services
- Kubernetes finalizers and garbage collection
- kubectl
- Flux Kustomization pruning

## Sources Consulted
- Flagger documentation: How it works, Canary target, services, and finalizers: https://docs.flagger.app/usage/how-it-works
- Flagger CRD schema for `revertOnDeletion`: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger controller finalizer implementation: https://github.com/fluxcd/flagger/blob/main/pkg/controller/finalizer.go
- Flagger Deployment controller implementation: https://github.com/fluxcd/flagger/blob/main/pkg/canary/deployment_controller.go
- Flagger Kubernetes service router implementation: https://github.com/fluxcd/flagger/blob/main/pkg/router/kubernetes_default.go
- Flagger controller reconciliation and finalizer registration: https://github.com/fluxcd/flagger/blob/main/pkg/controller/controller.go
- Flux Kustomization documentation for `prune`: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post described a generated `my-app-canary` Deployment. Flagger creates a primary Deployment named `<targetRef.name>-primary`; the original target Deployment is the canary workload, while `<service.name>-canary` is a generated Service. Updated the resource descriptions, diagram, and verification commands to refer to generated Services instead of a canary Deployment.
- The post stated that Flagger copies the primary pod spec back to the original Deployment during `revertOnDeletion`. Flagger's Deployment finalizer updates the target replicas to the primary replica count; it does not copy the primary pod template back to the target Deployment. Updated the deletion steps and active-rollout edge case to reflect the actual behavior.
- The post said the primary Deployment and generated resources are left behind by default. Flagger-created resources are owned by the Canary and can be removed by Kubernetes garbage collection; the documented default issue is that non-owned mutated resources remain in their current state. Updated the default-behavior section and diagram accordingly.
- The deployment listing command used `-l app=my-app`, which would typically miss the primary Deployment because Flagger changes the primary selector label value to `my-app-primary`. Changed the command to request `my-app` and `my-app-primary` by name.
- The verification section checked for a nonexistent `my-app-canary` Deployment and implied the target image would necessarily be the latest promoted image. Removed that image assertion and changed the cleanup checks to verify the generated primary and canary Services are gone.

## Review Notes
- The post's `apiVersion: flagger.app/v1beta1`, `spec.revertOnDeletion`, `spec.service.targetPort`, and analysis metric fields match the current Flagger CRD schema.
- The Flux `Kustomization` example uses `apiVersion: kustomize.toolkit.fluxcd.io/v1` and `prune: true`, which match current Flux documentation for garbage collection of removed resources.
- The Flagger install documentation currently lists Kubernetes v1.16 or newer as the general minimum, so the post's v1.23 prerequisite is conservative rather than invalid.
