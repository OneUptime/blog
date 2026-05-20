# Validation Summary: How to Combine Kustomize and Helm in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source applications
- Helm charts and values files
- Helm post-renderers
- Kustomize `helmCharts`
- Kubernetes manifests and strategic merge patches

## Sources Consulted
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Helm advanced techniques / post-renderer documentation: https://helm.sh/docs/topics/advanced/
- Kustomize API types documentation for `helmCharts`, `valuesFile`, `valuesInline`, and `patches`: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The multi-source section incorrectly said a Kustomize source can reference and patch the Helm source output. Argo CD renders each source independently and combines the resulting manifests; it does not pipe one source into another. I changed the section to describe multi-source as useful for Git-hosted values and additional Kustomize-rendered manifests, and added the official duplicate-resource behavior with `RepeatedResourceWarning`.
- The post-renderer section implied the main Argo CD integration issue was that Argo CD does not use `helm install`. Helm post-renderers also work with `helm template`; the more precise Argo CD limitation is that the Helm Application source does not expose `--post-renderer` directly. I updated the text to recommend `helmCharts`, multi-source, or a config management plugin.

## Review Notes
The `helmCharts` examples use fields that are present in Kustomize's API, and the Argo CD `kustomize.buildOptions: --enable-helm` configuration matches Argo CD documentation. The chart versions in the examples are older but still valid as pinned examples rather than recommendations for latest production versions.
