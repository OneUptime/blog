# Validation Summary: How to Use Karmada with Flux CD for Multi-Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Karmada
- Flux CD
- Kubernetes
- Helm
- GitOps
- Multi-cluster workload propagation

## Sources Consulted
- Karmada Propagation Policy documentation: https://karmada.io/docs/userguide/scheduling/propagation-policy/
- Karmada Override Policy documentation: https://karmada.io/docs/userguide/scheduling/override-policy/
- Karmada PropagationPolicy API reference: https://karmada.io/docs/reference/karmada-api/policy-resources/propagation-policy-v1alpha1/
- Karmada Cluster Failover documentation: https://karmada.io/docs/userguide/failover/cluster-failover/
- Karmada Cluster Taint Management documentation: https://karmada.io/docs/userguide/failover/cluster-taint-management/
- Karmada cluster registration documentation: https://karmada.io/docs/userguide/clustermanager/cluster-registration/
- Karmada Helm chart documentation and chart index: https://github.com/karmada-io/karmada/tree/master/charts/karmada
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization remote kubeConfig documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The post bootstrapped Flux directly against the Karmada API server. Flux controllers need to run on a real Kubernetes cluster, so this was changed to bootstrap Flux on the host control plane cluster and use a Flux Kustomization `kubeConfig.secretRef` to apply manifests to the Karmada API server.
- The architecture diagram still described Flux as running on the Karmada control plane. It was updated to show Flux running on the host control plane.
- The Karmada HelmRelease used stale chart version and value names. The chart version was updated to `v1.17.x`, and `replicas` values were changed to the chart's documented `replicaCount` fields.
- The weighted PropagationPolicy omitted `replicaDivisionPreference: Weighted`, which is required to make `weightPreference` define weighted replica division. This field was added.
- The OverridePolicy examples used deprecated top-level `targetCluster` and `overriders` fields and applied Deployment-specific patches without resource selectors. They were updated to use `resourceSelectors` and `overrideRules`.
- The failover example used an invalid current schema, `clusterFailoverPolicy`, and the deprecated purge mode spelling `Graciously`. It was corrected to `failover.cluster.purgeMode: Gracefully`, and the text now notes that cluster failover depends on `NoExecute` taints and the `Failover` feature gate.
- The failover prerequisites omitted the current `--enable-no-execute-taint-eviction=true` controller-manager flag required for `NoExecute` eviction handling. This was added alongside the `Failover` feature gate note.
- The Flux status command used the Karmada kubeconfig even though Flux now runs on the host control plane cluster. It was changed to use the host control plane kubeconfig.

## Review Notes
The Karmada and Flux integration pattern is valid when Flux reconciles into the Karmada API server through remote kubeconfig support. The tutorial still assumes users have a self-contained Karmada kubeconfig suitable for use inside the Flux controller Secret.
