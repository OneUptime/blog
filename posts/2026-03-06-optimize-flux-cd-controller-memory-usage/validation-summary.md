# Validation Summary: How to Optimize Flux CD Controller Memory Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD controllers
- Kubernetes Deployments and resource requests/limits
- Kustomize patches
- Go garbage collection environment variables
- Flux GitRepository and Kustomization custom resources
- PrometheusRule alerting
- Vertical Pod Autoscaler

## Sources Consulted
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux bootstrap customization guide: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Go garbage collector guide: https://go.dev/doc/gc-guide
- Go runtime/debug SetMemoryLimit documentation: https://go.dev/pkg/runtime/debug/

## Issues Found
- The controller memory patch section used the same `memory-patches.yaml` path for three different controller patches. Changed the examples to separate patch file names and updated the Kustomization overlay paths so each target applies the intended patch.
- The post claimed the source-controller and kustomize-controller cache fetched artifacts and rendered manifests. Adjusted the wording to avoid overstating implementation details and align with Flux's documented source artifact and kustomize reconciliation behavior.
- The artifact-size section said source-controller stores fetched artifacts on disk and in memory and that ignore rules directly reduce source-controller memory. Reworded this to the documented artifact storage behavior and a more accurate statement about reducing storage, transfer, and processing overhead.
- The source-controller args example used `--storage-max-artifact-size`, which is not a documented source-controller flag. Removed the invalid flag.
- The source-controller args example set `--artifact-retention-ttl=60m`, while the documented default is `1m`; this would increase old artifact retention. Changed it to `1m` and clarified that the goal is to keep older artifact retention short.
- The Prometheus memory ratio query divided two metric vectors without explicit label matching. Added `on(namespace, pod, container)` so the working-set metric matches the corresponding memory-limit metric correctly.
- The VPA section recommended switching from `Off` to `Auto`, but current Kubernetes VPA documentation marks `Auto` as deprecated since VPA 1.4.0. Changed the recommendation to `Recreate`.

## Review Notes
All YAML snippets were parsed successfully after edits. The resource values are examples and should still be tuned from observed metrics in a real cluster.
