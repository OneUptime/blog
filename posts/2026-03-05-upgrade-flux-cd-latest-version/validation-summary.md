# Validation Summary: How to Upgrade Flux CD to the Latest Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- kubectl
- GitOps
- Helm Controller and Kustomize Controller resources

## Sources Consulted
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- `flux version` command reference: https://fluxcd.io/flux/cmd/flux_version/
- `flux check` command reference: https://fluxcd.io/flux/cmd/flux_check/
- `flux install` command reference: https://fluxcd.io/flux/cmd/flux_install/
- `flux get all` command reference: https://fluxcd.io/flux/cmd/flux_get_all/
- `flux reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The post used `flux version --server` to check controller versions, but the current `flux version` reference documents `--client` only for version filtering; `--server` is an inherited Kubernetes API server address option. Changed the example to use `flux version --client` for the CLI and `flux version` for CLI plus server-side component versions.
- The post described `flux version --client` as listing available Flux CLI releases. That command only prints the installed client version. Updated the comment to say it checks the installed client version before comparing it with the release notes.
- The backup command claimed to export all Flux resources from `flux-system` while the command selected only several common resource kinds and used `-A`. Updated the comment to say it exports commonly used Flux resources.
- The reconciliation command was described as reconciling all Kustomizations, but `flux reconcile kustomization flux-system` reconciles a single Kustomization named `flux-system`. Updated the comment and command to reconcile the Flux system Kustomization with `--with-source`.
- The `flux install` upgrade description said it upgrades all Flux controllers. The current default component set excludes optional components such as image automation unless `--components-extra` is supplied. Added a caveat to include the same extra components used during installation.
- The automation section showed only a `GitRepository` watching the Flux repository, which does not by itself update Flux component manifests or upgrade controllers. Replaced it with the documented manifest regeneration workflow using `flux install --export`, commit, and push.

## Review Notes
The corrected guide aligns with the current Flux v2 upgrade procedure for CLI, bootstrap, direct install, and Git-based component manifest updates. Production users should still review release notes and test upgrades in staging, especially when optional Flux components are installed.
