# Validation Summary: How to Diagnose Istiod High CPU or Memory Usage

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Istiod / pilot-discovery
- Kubernetes
- kubectl
- Prometheus / PromQL
- Go pprof

## Sources Consulted
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio configuration scoping and discoverySelectors documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio dynamic admission webhooks overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Go pprof package documentation: https://pkg.go.dev/net/http/pprof

## Issues Found
- The post used `pilot_xds_connected_endpoints`, which is not the current documented Istio metric for connected XDS clients. Changed it to `pilot_xds`, which the Istio pilot-discovery reference documents as the number of endpoints connected to Pilot using XDS.
- The post treated `pilot_xds_pushes` as a configuration push counter. Current Istio documentation describes `pilot_xds_pushes` as Pilot build and send errors; changed push-rate examples to `pilot_push_triggers`.
- The post described `pilot_push_triggers` as a push queue size. Changed that example to show push trigger rate by reason, matching the metric's documented meaning.
- The post described `pilot_k8s_reg_events` as the number of watched Kubernetes resources. Changed the wording and query to describe Kubernetes registry event rate instead.
- The validation webhook metric example used `galley_validation_http_error` as webhook call count, but that metric is specifically HTTP serve errors. Changed it to validation pass/fail rate using `galley_validation_passed` and `galley_validation_failed`.
- The post used `pilot_xds_cache_size`, which is not listed in the current exported metrics reference. Changed it to `xds_cache_size`.
- The Kubernetes watch cache command claimed to show how many resources are cached while grepping an event metric. Changed the comment to "Check Kubernetes config event volume."
- The debounce tuning example set `PILOT_DEBOUNCE_AFTER` and `PILOT_DEBOUNCE_MAX` to the documented defaults or below the default while saying it increased the debounce window. Changed the example to use `PILOT_DEBOUNCE_AFTER: "500ms"` and `PILOT_DEBOUNCE_MAX: "10s"` so the text is accurate.

## Review Notes
The local workspace does not have `kubectl` installed, so kubectl syntax was checked against the official Kubernetes command reference rather than local `--help` output. The PrometheusRule structure and PromQL expressions are syntactically plausible, but alert thresholds remain environment-specific and should be tuned per mesh size and istiod resource limits.
