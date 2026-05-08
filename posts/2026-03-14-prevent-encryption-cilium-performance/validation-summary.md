# Validation Summary: Preventing Encryption Performance in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes CronJob
- PrometheusRule and Pushgateway-style metrics
- WireGuard
- IPsec
- Flux HelmRelease
- iperf3 and netperf

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec.html
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI command reference for encryption status: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The verification command used `cilium encrypt status`, which is not the documented Cilium CLI command. Changed it to `cilium encryption status`, which is the documented command for displaying cluster encryption status.
- The monitoring CronJob used the `networkstatic/iperf3` image while also relying on `jq` and `curl`, which are not guaranteed by that image. Changed the example to use supported `alpine:3.22` and install `curl`, `iperf3`, and `jq` before running the benchmark.
- The troubleshooting note referred broadly to userspace WireGuard. Current Cilium documentation requires kernel WireGuard support, and the userspace fallback was deprecated in older releases. Updated the note to call out deprecated userspace fallback on older Cilium releases.

## Review Notes
The examples remain illustrative and still require matching benchmark server pods, Prometheus Pushgateway service names, and namespace layout in the target cluster. The PrometheusRule expression and Flux HelmRelease shape are plausible, but production users should set thresholds from their own baselines rather than relying on the example values.
