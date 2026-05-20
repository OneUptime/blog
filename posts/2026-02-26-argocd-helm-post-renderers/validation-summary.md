# Validation Summary: How to Use Helm Post-Renderers with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kustomize
- Kubernetes manifests
- Config Management Plugins

## Sources Consulted
- Helm documentation: Advanced Helm Techniques / Post Rendering, https://helm.sh/docs/v3/topics/advanced/
- Argo CD documentation: Helm, https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD documentation: Kustomize, https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD documentation: Config Management Plugins, https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/config-management-plugins/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl command reference: kustomize command and `--enable-helm`, https://v1-32.docs.kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kustomize API type documentation for `labels`, `helmCharts`, and related Kustomization fields, https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The post incorrectly stated that ArgoCD has built-in Kustomize post-renderer support for Helm. Updated the wording to clarify that ArgoCD's native Helm source does not expose Helm's `--post-renderer` flag, and that Helm chart inflation through Kustomize requires `kustomize build --enable-helm`.
- The multi-source Helm and Kustomize method implied that ArgoCD can pipe Helm output into Kustomize through multi-source applications. Replaced that section with the documented `argocd-cm` `kustomize.buildOptions: --enable-helm` configuration.
- The examples used deprecated Kustomize `commonLabels`. Replaced them with the current `labels` transformer syntax using `pairs` and `includeSelectors: false`.
- The resource limits section claimed to update all containers while the JSON patch only targets container index `0`. Updated the wording to say it modifies a specific container.
- The Config Management Plugin section implied that applying a ConfigMap alone installs the plugin. Clarified that the plugin config must be mounted into a repo-server sidecar at `/home/argocd/cmp-server/config/plugin.yaml`, and added `set -o pipefail` to the sample command pipeline.
- The summary described Kustomize as an ArgoCD Helm post-renderer. Updated it to describe the accurate Kustomize Helm chart inflation workflow.

## Review Notes
The examples are illustrative and use placeholder chart repositories such as `https://charts.myorg.com`; those URLs are not expected to resolve. The sidecar and image pull secret patches target all Deployments selected by kind, so production use should usually narrow targets by name or labels to avoid unintentionally modifying unrelated chart resources.
