# Validation Summary: Preventing WireGuard vs IPsec Performance Differences in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes CronJob
- Prometheus Operator PrometheusRule
- Prometheus Pushgateway exposition endpoint
- Flux HelmRelease
- iperf3
- netperf
- Bash, jq, bc, curl

## Sources Consulted
- Cilium transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus rule syntax documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Local Docker check of `networkstatic/iperf3` image contents and bundled `iperf3 --help` output.

## Issues Found
- The CronJob used `networkstatic/iperf3` while the command pipeline also required `jq` and `curl`. A local Docker check showed the image contains `iperf3` but not `jq` or `curl`, so the example would fail before pushing the metric. Verified that the image is Debian-based and added `apt-get` commands to install `jq` and `curl` before running the measurement.
- The post stated that the framework continuously monitors the encryption overhead ratio, but the provided metric only measures encrypted throughput. Adjusted the wording to say that encrypted throughput is monitored continuously and can be compared with an unencrypted baseline when an overhead ratio is needed.

## Review Notes
- The Kubernetes CronJob manifest follows the documented `batch/v1` CronJob shape, including `spec.jobTemplate.spec.template.spec.containers` and `restartPolicy: OnFailure`.
- The PrometheusRule structure matches the Prometheus Operator CRD shape, and the alert expression is valid PromQL for comparing the latest gauge sample with a 30-day average.
- The Flux HelmRelease snippet uses the documented `spec.chart.spec` and `spec.valuesFrom` structure. The referenced HelmRepository and ConfigMap must exist in the same namespace as the HelmRelease, which is a deployment prerequisite rather than a syntax issue.
- To calculate a true encryption overhead ratio, operators still need a comparable unencrypted baseline metric from their own environment.
