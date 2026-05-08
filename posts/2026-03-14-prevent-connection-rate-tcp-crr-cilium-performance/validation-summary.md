# Validation Summary: Preventing Connection Rate (TCP_CRR) Degradation in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CronJob
- Prometheus and Prometheus Operator PrometheusRule
- Prometheus Pushgateway
- Hubble CLI
- netperf TCP_CRR
- Flux HelmRelease
- iperf3
- Bash, jq, bc, curl, kubectl

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps.html
- Cilium CNI Performance Benchmark documentation: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble release notes for json/jsonpb output behavior: https://github.com/cilium/hubble/releases/tag/v0.10.0
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API reference for CronJob restart policy: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- iperf3 user documentation: https://software.es.net/iperf/

## Issues Found
- The TCP_CRR examples parsed `awk '{print $1}'` from netperf output. For netperf TCP_CRR, the transaction rate is the final output column, so this would publish or compare the wrong value. Changed all netperf parsing examples to `awk '{print $NF}'`.
- The Hubble command used `-o json`, which has been deprecated in favor of `-o jsonpb`, and queried top-level flow fields that do not match newer Hubble JSON output wrapping. Changed the command to `-o jsonpb` and made the jq expression read `(.flow // .)` for compatibility.
- The Hubble connection-pattern example grouped full timestamps, which can leave nearly every event in a unique bucket. Changed the jq expression to trim timestamps to seconds before `sort | uniq -c`.

## Review Notes
- The Cilium `cilium_bpf_map_pressure` metric and `map_name` label are documented, and Cilium's eBPF map documentation confirms configurable CT and NAT map capacities.
- The Kubernetes CronJob and PrometheusRule manifests follow the documented API shapes, assuming the Prometheus Operator CRDs are installed.
- The Pushgateway pattern is technically valid for a periodic batch-style benchmark metric, but production deployments should ensure the chosen image includes both `netperf` and `curl` and should consider cleanup/staleness behavior for pushed metrics.
