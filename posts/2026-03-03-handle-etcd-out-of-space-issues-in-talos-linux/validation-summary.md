# Validation Summary: How to Handle etcd Out of Space Issues in Talos Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Talos Linux (talosctl)
- etcd (v3.5+, etcdctl)
- Kubernetes (kubectl, kube-apiserver)
- Prometheus Operator (PrometheusRule)
- YAML machine configuration patches

## Sources Consulted
- Sidero Labs Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos etcd maintenance docs: https://docs.siderolabs.com/talos/v1.11/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- etcd v3.5 maintenance docs: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd default quota discussion (2GB default / 8GB recommended max): https://github.com/etcd-io/etcd/issues/9771
- kube-prometheus etcd runbook (metric names): https://runbooks.prometheus-operator.dev/runbooks/etcd/etcdbackendquotalowspace/
- kube-apiserver reference (`--event-ttl`): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Talos `pkg/machinery/constants/constants.go` (etcd PKI file names): https://github.com/siderolabs/talos/blob/main/pkg/machinery/constants/constants.go
- Sidero Talos discussion #7214 (etcd cert SAN validation, use admin certs for client): https://github.com/siderolabs/talos/discussions/7214
- Talos configuration patches docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching

## Issues Found
1. **Incorrect etcdctl client certificates in the recovery pod.** The pod manifest used `peer.crt` / `peer.key` for `ETCDCTL_CERT` / `ETCDCTL_KEY`. Talos's etcd performs SAN validation that rejects peer certs when used as client certs against the client port (2379). The Sidero-recommended client cert for talking to Talos's etcd is `admin.crt` / `admin.key` (which is what Talos itself uses internally and what `talosctl get etcdsecret` returns). Changed both env vars to point at `admin.crt` and `admin.key`. The `/system/secrets/etcd` hostPath mount already contains these files.

## Review Notes
- The canonical Talos flag for applying patches is `--config-patch` (short `-p`). The post uses `--patch`, which works as an alias in current Talos versions but `--config-patch` is the documented form. Left as-is since both function correctly.
- The pod manifest uses a `hostPath` mount of `/system/secrets/etcd` for one-shot recovery use, which is acceptable. For long-running scraper pods (e.g., Prometheus etcd exporter), the Sidero-recommended pattern is to extract the certs into a Kubernetes Secret via `talosctl get etcdrootsecret` / `etcdsecret`. Not applicable here as this is a transient recovery pod.
- etcd's default quota of 2 GiB and recommended maximum of 8 GiB are correctly stated.
- `etcd_server_quota_backend_bytes` and `etcd_mvcc_db_total_size_in_bytes` are both valid current etcd Prometheus metrics.
- All talosctl etcd subcommands referenced (`etcd alarm list`, `etcd alarm disarm`, `etcd defrag`, `etcd status`, `get etcdmembers`, `logs etcd`, `processes`) are valid.
- `cluster.etcd.extraArgs.quota-backend-bytes` and `cluster.apiServer.extraArgs.event-ttl` are both valid Talos machine config fields and correct flag names.
