# Validation Summary: How to Measure Flux Source Fetch Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Flux source-controller
- Kubernetes custom resources
- kubectl
- Flux CLI
- Prometheus and PromQL
- Grafana

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Bucket documentation for source-controller reconciliation/status behavior: https://v2-6.docs.fluxcd.io/flux/components/source/buckets/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux get sources chart` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_chart/
- Flux CLI `flux reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The PromQL examples described kind-level averages and percentiles but did not aggregate over the `name` and `namespace` labels exposed by Flux reconciliation metrics. Updated the average and P95 examples to aggregate with `sum by (kind)` and `sum by (le, kind)`.
- The manual timing example waited only for the `Ready` condition, which could already be true before the newly requested reconciliation was handled. Updated the command to wait for `.status.lastHandledReconcileAt` to match the requested annotation value before waiting for `Ready`.
- The Flux CLI section said `flux get sources` lists last reconciliation duration. Official Flux CLI docs describe these commands as status listings, not duration reports. Updated the text to say they list source status.
- The dashboard section referred generically to a fetch error counter. Updated it to point at the documented `controller_runtime_reconcile_total{result="error"}` counter.
- The Git repository latency note implied shallow clones as a generic user option. Flux documents shallow cloning in relation to branch refs and supports sparse checkout via `.spec.sparseCheckout`, so the wording was tightened.

## Review Notes
Flux's `gotk_reconcile_duration_seconds` measures the full reconciliation duration for a source object, not only network fetch time. The post already states this, but future revisions could emphasize that it is a proxy for fetch latency rather than an isolated fetch-only timer.
