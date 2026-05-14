# Validation Summary: How to Use flux logs to View Controller Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- GitOps
- Helm Controller
- Kustomize Controller
- Source Controller

## Sources Consulted
- Flux CLI `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux monitoring logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux source code for `flux logs`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/logs.go
- Flux source code for `flux get kustomizations`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_kustomization.go
- Flux source code for `flux get helmreleases`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_helmrelease.go

## Issues Found
- The post described `flux logs` as showing all Flux controller logs by default. The Flux CLI fetches logs from Flux controller pods, but filters entries to the current namespace scope by default, which is `flux-system`; I updated the text and examples to use `--all-namespaces` where the post claimed cluster-wide resource logs.
- The post referred to filtering by "controller kind" for `--kind`. The Flux CLI filters by Flux resource kind or controller kind metadata in the structured log entry; I changed the section title and wording to "resource kind" to match common `Kustomization`, `GitRepository`, and `HelmRelease` usage.
- The sample output used controller names such as `source-controller` where the Flux formatter outputs resource kind/name.namespace when those fields are present. I updated the sample output to match the documented and source-code-backed formatter.
- A few examples referred to "all controllers" or "source controller logs" when the command filtered `GitRepository` or other Flux resource logs. I adjusted those comments to accurately describe the resource filters.
- The common flags table omitted `--all-namespaces` / `-A`, which is important for the corrected cluster-wide examples. I added it.

## Review Notes
The `flux logs` command is marked as preview in the official Flux CLI documentation, so future Flux releases may change its behavior or output format. The `--level=debug` filter is valid, but debug entries only appear if controllers are configured to emit debug logs.
