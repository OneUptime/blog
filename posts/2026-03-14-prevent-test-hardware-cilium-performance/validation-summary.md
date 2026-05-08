# Validation Summary: Preventing Test Hardware Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Prometheus Operator
- Prometheus node_exporter metrics
- Flux HelmRelease
- Bash
- iperf3
- netperf
- Alpine Linux containers

## Sources Consulted
- Cilium Kubernetes requirements and compatibility guidance: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium CLI command reference for `cilium status` and `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_status/ and https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator design documentation for `PrometheusRule`: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus node_exporter documentation for collectors and network metrics: https://github.com/prometheus/node_exporter
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Alpine Linux release branch support: https://www.alpinelinux.org/releases/
- Local tool availability and versions for `jq`, `bc`, and `ethtool`

## Issues Found
- The prerequisites originally said "Kubernetes cluster (v1.24+) with Cilium v1.14+", which implied all newer Kubernetes and Cilium versions are mutually supported. Cilium documents compatibility per Cilium release, so this was changed to require a supported Kubernetes and Cilium version combination.
- The hardware validation script documented 25G NIC and AVX2 requirements but only checked CPU core count and AES-NI. The script now checks the selected interface speed, AES-NI, and AVX2, and supports overriding the interface with `IFACE`.
- The CronJob used `networkstatic/iperf3` while running `jq` and `curl`, which are not guaranteed to be present in that image. The example now uses a supported Alpine image and installs `curl`, `iperf3`, and `jq` before running the benchmark.
- The CronJob example used an unqualified `node-2` target. It now uses an explicit `IPERF_SERVER` environment variable with a replaceable DNS name.

## Review Notes
The PrometheusRule and CronJob API versions are current for modern Kubernetes and Prometheus Operator installations. The Prometheus alert examples assume node_exporter exposes the cpufreq and netdev metrics and that the tested NIC is named `eth0`; production environments should adjust metric selectors for their exporter configuration and interface names. The replacement CronJob image was pinned to `alpine:3.22`, which is supported by Alpine's official release schedule as of the review date.
