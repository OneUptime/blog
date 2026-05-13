# Validation Summary: How to Add Tolerations with Post-Renderer in HelmRelease

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux HelmRelease
- Helm post-renderers
- Kustomize patches
- Kubernetes taints and tolerations
- Kubernetes Deployments, DaemonSets, StatefulSets, and Jobs
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kustomize multiple-object patch example: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/patchMultipleObjects.md

## Issues Found
- The post described tolerations as ensuring pods can be scheduled or run on tainted nodes. Kubernetes tolerations only allow scheduling onto matching tainted nodes; other scheduling constraints still apply, and tolerations do not force placement on those nodes. Updated the affected wording to use "allow" and clarified that node selectors or node affinity should be combined with tolerations when pods must run only on specific tainted nodes.
- The "Tolerating All Taints on a Node" section said this schedules a pod on any node regardless of taints. Updated the wording to clarify that omitting key and effect with `operator: Exists` allows the pod to tolerate taints with any key, value, or effect, without implying guaranteed placement.

## Review Notes
- The `helm.toolkit.fluxcd.io/v2` HelmRelease examples use current Flux post-renderer syntax. Flux documents `spec.postRenderers[].kustomize.patches` for inline strategic merge and JSON patches.
- The Kustomize examples that target all resources of a kind while using a placeholder `metadata.name` are valid: Kustomize requires a name in strategic merge patches, but does not use it when a `target` selector is specified.
- The Kubernetes toleration examples use valid fields and effects. `tolerationSeconds` is correctly limited to `NoExecute` behavior.
- `kubectl` was not installed in the local environment, so command verification was done against official Kubernetes documentation rather than local `kubectl --help` output.
