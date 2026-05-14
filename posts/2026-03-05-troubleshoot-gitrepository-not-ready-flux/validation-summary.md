# Validation Summary: How to Troubleshoot GitRepository Not Ready Errors in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux source-controller
- Kubernetes GitRepository custom resources
- Kubernetes Secrets
- Kubernetes NetworkPolicy
- Prometheus and kube-state-metrics

## Sources Consulted
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux latest installation manifest for source-controller deployment defaults: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The post used `flux get source git`, but the current documented Flux CLI command is `flux get sources git`. Updated both occurrences.
- The post recommended `flux reconcile source git my-app --with-source`, but `flux reconcile source git` does not support `--with-source`. Removed the unsupported flag.
- The network diagnostics used `kubectl exec` into `deployment/source-controller` and assumed tools like `wget` and `nslookup` were available in the source-controller image. Replaced these with disposable BusyBox diagnostic pods in the `flux-system` namespace using source-controller labels.
- The memory patch increased the limit to `512Mi`, which can be lower than the current default source-controller memory limit in the Flux install manifest. Updated the example to `1Gi`.
- The Prometheus alert used `gotk_reconcile_condition` as if it were a default Flux controller metric. Current Flux docs describe custom resource state metrics as kube-state-metrics output and show `gotk_resource_info`; updated the wording and alert expression accordingly.

## Review Notes
The custom CA example uses `caFile`, which is still supported, although current Flux documentation also supports `ca.crt` and gives it precedence when both keys are present.
