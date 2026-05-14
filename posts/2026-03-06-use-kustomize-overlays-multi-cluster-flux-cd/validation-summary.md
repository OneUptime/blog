# Validation Summary: How to Use Kustomize Overlays for Multi-Cluster with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization resources
- Kustomize bases, overlays, labels, annotations, and patches
- Kubernetes Deployments, ConfigMaps, HPAs, PodDisruptionBudgets, NetworkPolicies
- Prometheus Operator ServiceMonitor custom resources
- kubectl dry-run validation
- kubeconform manifest schema validation

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kustomize upstream README and examples: https://github.com/kubernetes-sigs/kustomize
- kubeconform documentation: https://github.com/yannh/kubeconform
- kpt kubeval deprecation notice: https://catalog.kpt.dev/kubeval/v0.3/

## Issues Found
- The Kustomize snippets used `commonLabels`, which current Kustomize treats as deprecated in favor of the `labels` transformer. Updated the base and overlay examples to use `labels` with `pairs` and `includeSelectors: true`, preserving the behavior of adding those labels to selectors.
- The local validation command used `kubeval --strict`. kubeval is deprecated, and the US East overlay includes a ServiceMonitor CRD that default Kubernetes schemas may not cover. Replaced the command with `kubeconform -strict -ignore-missing-schemas` and added a short note to configure CRD schema locations when validating custom resources.
- The EU NetworkPolicy comments described the `10.0.0.0/8` private CIDR as proving "EU-only endpoints." A CIDR alone does not prove geography, so the wording now says private EU database endpoints / EU network.

## Review Notes
The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields such as `path`, `prune`, `sourceRef`, `dependsOn`, `healthChecks`, and `timeout`. The Kubernetes resource examples use current stable API versions for the built-in resources shown. The ServiceMonitor example depends on the Prometheus Operator CRD being installed in the target cluster.
