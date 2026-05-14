# Validation Summary: How to Configure HelmRelease Interval in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Flux source-controller
- Kubernetes
- Helm
- HelmRelease custom resources
- Flux CLI

## Sources Consulted
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmChart source documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI `flux suspend helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux CLI `flux resume helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux Helm drift detection documentation: https://fluxcd.io/flux/installation/configuration/helm-drift-detection/

## Issues Found
- The introduction described `spec.interval` as checking whether desired state in Git matches cluster state. Flux helm-controller reconciles the Helm release against the HelmRelease and chart artifact in the cluster; Git synchronization is handled by source/kustomize workflows. Updated the wording to match the HelmRelease reconciliation model.
- The introduction implied drift detection and correction as a general behavior. Flux Helm drift detection/correction is optional and depends on `.spec.driftDetection.mode`. Updated the wording to state that drift detection and correction happen when configured.
- The reconciliation steps implied each HelmRelease reconciliation checks the chart source directly. Updated the wording to refer to the referenced chart artifact produced from the source.
- The chart interval section did not mention that `spec.chart.spec.interval` defaults to HelmRelease `spec.interval` when omitted. Added that clarification based on the Flux API reference.

## Review Notes
The examples use `helm.toolkit.fluxcd.io/v2`, valid duration strings, supported `spec.interval`, `spec.chart.spec.interval`, `spec.suspend`, and current Flux CLI commands. The legacy inline `spec.chart.spec.sourceRef` style remains documented and valid; Flux also supports `spec.chartRef` for referencing source-controller artifacts directly.
