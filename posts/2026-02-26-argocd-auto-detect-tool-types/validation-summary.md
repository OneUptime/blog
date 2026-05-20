# Validation Summary: How ArgoCD Automatically Detects Application Tool Types

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes manifests
- Helm
- Kustomize
- Jsonnet
- Config Management Plugins

## Sources Consulted
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Directory documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD current source, `util/app/discovery/discovery.go`: https://github.com/argoproj/argo-cd/blob/master/util/app/discovery/discovery.go
- Argo CD current source, `reposerver/repository/repository.go`: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go
- Argo CD current source, `pkg/apis/application/v1alpha1/types.go`: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go

## Issues Found
- The post described a separate auto-detected `Jsonnet` source type. Current Argo CD API source types are `Helm`, `Kustomize`, `Directory`, and `Plugin`; Jsonnet support is handled through directory applications. Updated the Jsonnet section, source type output list, API example, and summary.
- The post claimed directory applications recursively read manifest files by default. Official Argo CD documentation says directory apps include only files from the root of the configured path unless `directory.recurse: true` is set. Updated the directory detection explanation.
- The post claimed CMP plugins are checked after all built-in tools. Current Argo CD discovery source checks matching sidecar CMP plugins before the built-in marker-file walk. Updated the detection algorithm and CMP conflict guidance.
- The post presented mixed Helm and Kustomize marker files as a deterministic Helm win. Current behavior should not be relied on for mixed marker files, so the scenario now recommends explicit source configuration.

## Review Notes
The official tool detection page documents Helm and Kustomize marker-file detection but does not fully describe current sidecar CMP discovery behavior, so the current Argo CD source was used to validate that portion.
