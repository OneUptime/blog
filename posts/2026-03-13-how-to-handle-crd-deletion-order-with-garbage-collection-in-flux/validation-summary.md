# Validation Summary: How to Handle CRD Deletion Order with Garbage Collection in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- Kubernetes finalizers
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Flux kustomize-controller issue discussing reverse dependency pruning behavior: https://github.com/fluxcd/kustomize-controller/issues/301

## Issues Found
- The post claimed Flux automatically respects `dependsOn` in reverse when deleting Kustomization objects. Flux documentation defines `dependsOn` as an apply/readiness dependency, and Flux garbage collection on Kustomization deletion is backgrounded unless controlled with `deletionPolicy`. I changed the guidance to say dependencies ensure apply order, while deletion should be staged manually in reverse order.
- The post claimed `wait: true` ensures Flux waits for deletion of custom resources and finalizer resolution. Flux documents `wait` as health checking for reconciled resources, not deletion waiting. I replaced this with `deletionPolicy: WaitForTermination` and kept `timeout`, which is the documented mechanism for waiting for managed resources to be removed when a Kustomization object is deleted.
- The practical YAML examples for custom-resource Kustomizations did not include the deletion policy needed for the described behavior. I added `deletionPolicy: WaitForTermination` to the custom resources and monitoring config examples.
- The conclusion overstated dependency chains as enforcing deletion order. I revised it to recommend dependency chains for apply order plus staged deletion with `deletionPolicy: WaitForTermination` where Flux should wait for managed resources to terminate.

## Review Notes
The kubectl command syntax matches the official kubectl reference, but `kubectl` was not installed in the local environment, so command verification was done against Kubernetes documentation rather than local `--help` output.
