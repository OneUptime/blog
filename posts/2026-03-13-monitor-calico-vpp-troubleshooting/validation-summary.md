# Validation Summary: How to Monitor Calico VPP for Troubleshooting Signals

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP dataplane
- FD.io VPP
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Bash

## Sources Consulted
- Calico VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP generated manifest: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Calico VPP metrics documentation: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/docs/metrics/README.md
- Calico VPP metrics list: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/docs/metrics/metrics.md
- Calico VPP Prometheus implementation: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/calico-vpp-agent/prometheus/prometheus.go
- Calico VPP configuration defaults: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/config/config.go
- FD.io VPP statistics documentation: https://docs.fd.io/vpp/19.08/stats_doc.html
- FD.io VPP issue-reporting command reference for `vppctl show error`: https://docs.fd.io/vpp/25.10/contributing/reportingissues/reportingissues.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described VPP runtime metrics as coming from a "stats socket"; changed this to "stats segment" to match VPP documentation.
- The post referred to `calico-vpp-manager` as the Prometheus metrics component on port `9098`; changed this to `calico-vpp-agent`, which exposes `/metrics` on port `8888` when Prometheus support is enabled.
- The post claimed the Calico VPP metrics endpoint tracks VPP API call success/failure rates; changed this to interface, TCP, and session statistics, matching the documented and implemented metrics.
- The Kubernetes commands used `app=calico-vpp-node` and container `calico-vpp-manager`; changed them to the documented/generated manifest label `k8s-app=calico-vpp-node` and container `agent`.
- The ServiceMonitor snippet selected the wrong label and did not define a Service with a named `metrics` port; added the matching Service and corrected the ServiceMonitor selector.
- The error counter script used `grep -v " 0 "`, which could count headers and non-counter lines; replaced it with `awk` filtering on a numeric first field greater than zero.
- The monitoring diagram showed the script feeding Alertmanager directly; changed that path to a log/stdout sink because Alertmanager does not ingest arbitrary script output directly.
- The alert examples used the old manager name and did not scope pod phase alerts to Calico VPP pods; corrected the alert name, summary, and pod selector.

## Review Notes
Prometheus support in Calico VPP is disabled by default through `CALICOVPP_FEATURE_GATES`; operators must enable `prometheusEnabled` before the scrape examples return Calico VPP metrics.
