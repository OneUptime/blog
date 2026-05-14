# Validation Summary: How to Configure Kustomization Replicas Transformer in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kustomize
- Kubernetes Deployments, StatefulSets, and ReplicaSets
- Horizontal Pod Autoscaler

## Sources Consulted
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize replicas example: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/replicas.md
- Kustomize Replica type definition: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/replica.go
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ on Kustomization behavior and HPA replica fields: https://fluxcd.io/flux/faq/
- Flux CLI `flux create kustomization` documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post said the Kustomize `replicas` transformer matches by `name` and `kind`, defaulting to Deployment. Kustomize's `Replica` configuration only defines `name` and `count`, so this was corrected to say it matches scalable resources by `name`.
- The post said the `replicas` field was introduced in Kustomize v5.0. The Kustomize type and examples show the field existed before v5, so this was changed to a version-neutral statement.
- The patch comparison said patches were required before the `replicas` field was available. Because the field predates v5 and the post does not target a specific old Kustomize release, this was changed to "Without the `replicas` field."
- The HPA section said Flux would reset replicas unless the Kustomization was suspended or the replicas field was excluded. Flux documents that fields diverging from Git are overwritten and specifically recommends omitting `spec.replicas` for HPA-managed Deployments, so the sentence was tightened to say Flux resets replicas when the generated manifest still declares `spec.replicas`.

## Review Notes
The YAML examples use current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization resources and valid Kustomize `replicas` syntax. The local environment did not have `kustomize`, `flux`, or `kubectl` installed, so CLI behavior was verified against official command documentation rather than local command output.
