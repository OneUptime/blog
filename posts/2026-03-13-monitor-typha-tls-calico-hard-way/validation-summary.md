# Validation Summary: How to Monitor Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (Typha component)
- Kubernetes (CronJob, Secrets, Deployments)
- Prometheus (alerting rules, PromQL)
- kube-state-metrics
- x509-certificate-exporter
- Grafana
- Loki
- OpenSSL
- Alpine Linux (container image)

## Sources Consulted
- Calico Typha Prometheus reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Typha sync server source: https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/sync_server.go
- kube-state-metrics Secret metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md
- x509-certificate-exporter: https://github.com/enix/x509-certificate-exporter
- alpine/openssl Docker Hub: https://hub.docker.com/r/alpine/openssl
- Kubernetes 1.21 CronJob GA announcement: https://kubernetes.io/blog/2021/04/09/kubernetes-release-1.21-cronjob-ga/
- calico/typha image: https://hub.docker.com/r/calico/typha

## Issues Found

1. **Wrong Typha metrics port (9093 instead of 9091)**: The default Typha Prometheus metrics port is `9091`, not `9093`. Fixed in the port-forward command in Step 3 and in the on-call runbook in Step 5.

2. **Invalid kube-state-metrics PromQL expression for cert expiry**: The original alert tried to join `kube_secret_info` with `kube_secret_labels` on an `expiry_date` label. kube-state-metrics does not parse Secret contents and there is no `expiry_date` label exposed by default. Replaced with an example using the standard `x509-certificate-exporter` metric `x509_cert_not_after`, which is the recommended approach.

3. **BusyBox `date -d` cannot parse OpenSSL date format**: The CronJob used the `alpine/openssl` image, whose BusyBox `date` cannot parse timestamps containing the `GMT` timezone (e.g., `Jun 24 09:46:10 2024 GMT`) and would fail with `invalid date`. Switched the image to `alpine:3.19` and added `apk add --no-cache openssl coreutils` so GNU `date` (with full `-d` support) is available.

4. **`wget` not available in calico/typha image**: The on-call runbook used `kubectl exec ... wget -qO- http://localhost:9091/metrics`, but the official `calico/typha` image is minimal/distroless-style and ships neither a shell nor `wget`/`curl`. Replaced with a `kubectl port-forward` + `curl` pattern run from the operator's machine.

## Review Notes
- The Typha metrics referenced (`typha_connections_active`, `typha_connections_dropped`) are valid metric names exposed by Typha's Prometheus server.
- `apiVersion: batch/v1` for `CronJob` is correct for Kubernetes 1.21+ (it went GA in 1.21; `batch/v1beta1` was removed in 1.25).
- For TLS-specific connection rejection monitoring, readers may also consider correlating `typha_connections_dropped` with log-based detection, since dropped connections can result from rebalancing as well as TLS failures.
- The Prometheus expression in Step 3 assumes a single Typha replica's metric is scraped; in a multi-replica deployment the comparison should aggregate across replicas (e.g., `sum(typha_connections_active)`).
