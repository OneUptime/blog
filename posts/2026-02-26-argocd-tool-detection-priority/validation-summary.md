# Validation Summary: How to Configure Tool Detection Priority in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Config Management Plugins
- Helm
- Kustomize
- Jsonnet
- Kubernetes manifests and ConfigMaps
- Argo CD CLI

## Sources Consulted
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD v3.4.1 repository source detection code: https://github.com/argoproj/argo-cd/blob/v3.4.1/util/app/discovery/discovery.go
- Argo CD v3.4.1 repo-server source type code: https://github.com/argoproj/argo-cd/blob/v3.4.1/reposerver/repository/repository.go

## Issues Found
- The post claimed automatic detection priority was Helm > Kustomize > Jsonnet > CMP > Directory. Current Argo CD source checks explicit source type first, then CMP discovery, then Helm/Kustomize marker files, then Directory fallback. Jsonnet is processed inside directory handling rather than auto-detected as its own source type. Updated the explanation and summary.
- The post claimed CMP plugin priority is controlled primarily by sidecar container order. Argo CD lists plugin socket files and checks them in `os.ReadDir` order, which is sorted by filename. Updated the section to describe socket-name ordering and explicit plugin selection.
- The CMP discovery example was a bare fragment and did not show `spec.discover`. Updated the snippet so it matches the `ConfigManagementPlugin` structure.
- The "Use .argocd-source Configuration" heading did not match the example, which configures the Application/ApplicationSet source directly. Renamed it to "Configure the Source Explicitly."
- The "Default Directory Behavior" example used `resource.exclusions`, which is not a directory generation default. Replaced it with Argo CD's documented built-in generator enable/disable settings.
- The Helm ConfigMap comment described `helm.valuesFileSchemes` as default Helm parameters. Updated it to describe its actual purpose: allowing additional Helm values file URL schemes.

## Review Notes
The guide is now accurate for current Argo CD behavior as documented and implemented in v3.4.1. One caveat for future revisions: Argo CD's public tool detection docs summarize only Helm, Kustomize, and Directory fallback, while CMP discovery behavior is clearest in the source and CMP documentation.
