# Validation Summary: How to Use flux stats to View Cluster Statistics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- GitOps
- Bash scripting
- kubectl

## Sources Consulted
- Flux CLI reference: `flux stats` - https://fluxcd.io/flux/cmd/flux_stats/
- Flux CLI reference: `flux get` - https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI reference: `flux get kustomizations` - https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI reference: `flux get helmreleases` - https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI reference: `flux get sources all` - https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI reference: `flux get sources git` - https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI reference: `flux get sources chart` - https://fluxcd.io/flux/cmd/flux_get_sources_chart/
- Flux CLI reference: `flux resume kustomization` - https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flux CLI reference: `flux resume helmrelease` - https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Flux CLI reference: `flux events` - https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI reference: `flux logs` - https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI source for `stats` behavior - https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/stats.go

## Issues Found
- The post described `flux stats` as reporting readiness across all Flux resource types. Updated this to describe Flux custom resource counts, reconcile status, and artifact storage usage.
- The post said `RUNNING` means resources are actively reconciling. In the Flux CLI implementation, this column is the total count minus suspended resources. Updated the column description to "resources that are not suspended."
- The post said the command reports the number of ready resources. Updated this to "non-suspended resources" to match the `RUNNING` column.
- The resource diagram omitted notification resources that `flux stats` includes. Added a notification resources node.
- The post used `flux resume kustomization --all --all-namespaces` and `flux resume helmrelease --all --all-namespaces`, but the resume commands support `--all` within a namespace and do not document `--all-namespaces`. Updated the examples to use `--namespace production`.
- The report script used `grep "True"` to identify suspended resources, which could match the `READY` column rather than the `SUSPENDED` column. Updated it to check the final column with `awk`.

## Review Notes
The Flux CLI was not installed in the local environment, so command verification was performed against official Flux documentation and Flux's upstream CLI source. The official docs mark `flux stats`, `flux events`, `flux logs`, and `flux get sources all` as preview commands, so future Flux releases may change behavior.
