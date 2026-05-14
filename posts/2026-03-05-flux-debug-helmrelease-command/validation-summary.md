# Validation Summary: How to Debug HelmRelease with flux debug helmrelease in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Helm
- HelmRelease
- Bash

## Sources Consulted
- Flux CLI documentation for `flux debug helmrelease`: https://fluxcd.io/flux/cmd/flux_debug_helmrelease/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI documentation for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI documentation for `flux debug kustomization`: https://fluxcd.io/flux/cmd/flux_debug_kustomization/
- Kubernetes documentation for kubectl JSONPath output: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post incorrectly described `flux debug helmrelease` as a single consolidated command that includes source status, events, Helm release history, and controller logs by default. Updated the description to match the official preview command modes: `--show-status`, `--show-values`, and `--show-history`.
- Several examples omitted the required mode flag for the output being described. Added `--show-status` where the post expects HelmRelease status output.
- The post claimed source status and events are included in `flux debug hr` output. Replaced that with complementary commands such as `flux get sources helm`, `kubectl events --for HelmRelease/<name>`, and `flux logs`.
- The post used `flux get source helm`, but the official command is `flux get sources helm`. Corrected the command.
- The post used `flux get helmrelease --all-namespaces` and `grep -v "True"` for failing releases. Updated this to the documented `flux get helmreleases --all-namespaces --status-selector ready=false`.
- The CI/CD script used `flux get hr <name> -o json`, but the documented `flux get helmreleases` command does not expose that JSON output form. Replaced it with `kubectl get helmrelease ... -o jsonpath=...`.
- The Kustomization debug example omitted `--show-status` and implied identical flags to HelmRelease debugging. Updated it to use `--show-status` and note the Kustomization-specific `--show-vars` flag.
- Added a warning that `--show-values` can print values from referenced Secrets, matching the official Flux warning.

## Review Notes
The Flux debug commands are marked as preview in the official documentation, so future CLI versions may introduce breaking changes. The post now reflects the current documented behavior as of 2026-05-14.
