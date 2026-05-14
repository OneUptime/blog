# Validation Summary: How to Troubleshoot HelmChart Not Found Errors in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes custom resources
- Helm
- HelmRepository
- HelmChart
- OCI Helm registries
- kubectl

## Sources Consulted
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux CLI `flux reconcile source chart`: https://fluxcd.io/flux/cmd/flux_reconcile_source_chart/
- Helm CLI `helm search repo`: https://helm.sh/docs/helm/helm_search_repo/
- Helm CLI `helm show chart`: https://helm.sh/docs/helm/helm_show_chart/

## Issues Found
- The HelmRepository readiness guidance treated all HelmRepository resources as if they report `READY: False`. Flux documentation states OCI HelmRepository resources are data containers and do not report `READY` or `STATUS`, so the text now distinguishes HTTP/S HelmRepository readiness from OCI validation.
- The chart-name examples mixed Helm repository aliases with Flux `spec.chart` values. The examples now show that `spec.chart` should contain the chart name as exposed by the source, not a local Helm repo alias such as `my-repo/nginx`.
- The command for inspecting Secret keys used `kubectl -o jsonpath='{.data}' | python3 -m json.tool`, but kubectl jsonpath map output is not guaranteed to be JSON. It now uses a kubectl Go template to list the keys directly.
- The OCI HelmRepository example included `interval` without noting that Flux ignores it for OCI HelmRepository resources. A comment was added to avoid implying that the interval controls OCI polling.

## Review Notes
Flux documentation notes that HelmRepository `type: oci` is in maintenance mode and recommends the OCIRepository API for improved OCI Helm chart support. The post remains valid for troubleshooting existing HelmRepository-based OCI chart references, but a future update could add OCIRepository-specific guidance.
