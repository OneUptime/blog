# Validation Summary: How to Use VS Code GitOps Extension with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Visual Studio Code
- GitOps Tools for Flux VS Code extension
- Flux CD
- Flux CLI
- Kubernetes
- kubectl
- VS Code Kubernetes extension
- Red Hat YAML extension

## Sources Consulted
- GitOps Tools for Flux extension repository and README: https://github.com/weaveworks/vscode-gitops-tools
- GitOps Tools for Flux extension package metadata: https://raw.githubusercontent.com/weaveworks/vscode-gitops-tools/v0.27.0/package.json
- VS Code Kubernetes extension repository: https://github.com/vscode-kubernetes-tools/vscode-kubernetes-tools
- Red Hat YAML extension repository: https://github.com/redhat-developer/vscode-yaml
- Flux CLI `reconcile` documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux CLI `events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux community JSON schemas: https://github.com/fluxcd-community/flux2-schemas

## Issues Found
- The prerequisite listed Visual Studio Code v1.80 or later, but the extension metadata declares support from VS Code v1.63. Updated the prerequisite to v1.63 or later.
- The dependency section implied the Kubernetes extension was merely recommended. The extension metadata lists `ms-kubernetes-tools.vscode-kubernetes-tools` as an extension dependency, so the wording now says it is installed automatically if missing.
- Several settings used a non-existent `vs-code-gitops.*` namespace. Replaced those with the actual Kubernetes extension kubeconfig setting (`vs-kubernetes.kubeconfig`) and the only exposed GitOps Tools setting (`gitops.weaveGitopsEnterprise`).
- The resource context menu items were named incorrectly. Replaced "Show YAML", "Show Events", and "Show Conditions" with supported actions such as "View Config", "Trace", and "Copy Name".
- The command palette instructions referenced generic "GitOps: Reconcile" and "GitOps: Create" commands that are not exposed by the extension metadata. Updated them to describe the separate source/workload reconcile actions and the `GitOps: Add Source` / `GitOps: Add Kustomization` commands.
- The YAML schema section attributed schema validation to the GitOps extension and used Flux CRD URLs that return 404. Updated the text to attribute schema validation to the Red Hat YAML extension and replaced the URLs with JSON schema files from `fluxcd-community/flux2-schemas`.
- The keyboard shortcut examples used non-existent command IDs (`gitops.flux.reconcile`, `gitops.views.refreshAll`, and `gitops.flux.showYaml`). Replaced them with valid no-argument command IDs from the extension metadata.
- The multi-cluster switching instructions described a header dropdown that is not documented in the extension metadata. Updated the instructions to use the Clusters view and "Set as Current Context" action.
- The terminal example used `flux get kustomization ... -o yaml`, but the Flux `get kustomizations` command does not document `-o yaml`. Replaced it with `kubectl get kustomization ... -o yaml`.

## Review Notes
- The GitOps Tools for Flux extension latest release in the upstream repository is v0.27.0 from January 20, 2024, and the repository README describes the extension as having a rolling beta/stable release cycle where breaking changes remain possible.
- The `flux events` command is documented by Flux as preview and under development, so future CLI behavior may change.
