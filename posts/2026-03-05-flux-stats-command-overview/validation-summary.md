# Validation Summary: How to Use flux stats Command for Overview

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- GitHub Actions
- Prometheus / Grafana monitoring
- Bash and awk

## Sources Consulted
- Flux CLI reference for `flux stats`: https://fluxcd.io/flux/cmd/flux_stats/
- Flux CLI reference for `flux get`: https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI reference for `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI reference for `flux events`: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI reference for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI `stats` implementation source: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/stats.go

## Issues Found
- The post described `flux stats` columns as `READY` and `FAILED`, but current Flux uses `RUNNING` and `FAILING`. Updated the sample output, column explanations, watch points, scripts, and summary to use the correct column names.
- The post described `READY` as successful reconciliation. Current `flux stats` computes `RUNNING` as resources that are not suspended, while `FAILING` counts resources with `Ready=False`. Updated the explanation to match the implementation.
- The production monitoring note referenced `gotk_reconcile_condition` and `gotk_suspend_status`, which are not the current metrics documented by Flux. Updated it to reference `gotk_resource_info` with `ready` and `suspended` labels.
- The GitHub Actions example exported `KUBECONFIG` only inside the configure step, so the next step would not inherit it. Updated the example to write the kubeconfig to `~/.kube/config`, where kubectl and Flux can find it by default.
- The health-check message claimed all resources were reconciling successfully when only the failing count was checked. Updated it to say that no Flux resources are currently failing.

## Review Notes
The `flux stats` command is marked as preview in the official Flux CLI documentation, so output details may change in future Flux releases. The local environment did not have the Flux CLI installed, so verification used current official documentation and the Flux CLI source.
