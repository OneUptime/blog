# Validation Summary: How to Benchmark Kubernetes Performance on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Pods, Services, Jobs, CronJobs)
- iperf3 (network bandwidth testing)
- netperf (network latency testing, TCP_RR)
- fio (disk benchmarking)
- etcd / etcdctl (`check perf` benchmark)
- kubectl (run, wait, delete, logs)
- talosctl (`etcd status`)
- k6 (API server load testing)
- CoreDNS / dig (DNS resolution)
- Alpine Linux (`apk`, `bind-tools`)
- Cilium / eBPF CNI

## Sources Consulted
- Talos Linux talosctl reference (`talosctl etcd status`): https://www.talos.dev/latest/reference/cli/
- etcdctl `check perf` documentation: https://etcd.io/docs/v3.5/op-guide/performance/
- Kubernetes `kubectl run` and `kubectl wait` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes CronJob API (`batch/v1`, GA in v1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- fio man page / options reference: https://fio.readthedocs.io/en/latest/fio_doc.html
- netperf manual (TCP_RR `-O` output selectors including `*_LATENCY`): https://hewlettpackard.github.io/netperf/doc/netperf.html
- k6 official Docker image (`grafana/k6`): https://hub.docker.com/r/grafana/k6
- Alpine `bind-tools` package providing `dig`: https://pkgs.alpinelinux.org/packages?name=bind-tools

## Issues Found
- **Buggy cleanup selector in the pod scheduling benchmark.** The original command `kubectl delete pod -l run=bench-pod --force` would have matched zero pods, because `kubectl run "bench-pod-$i"` automatically applies a per-pod label `run=bench-pod-<i>` (not a shared `run=bench-pod` label). Replaced with an explicit loop that deletes each named pod with `--ignore-not-found` so the cleanup actually removes the 20 benchmark pods that were just created.

## Review Notes
- The etcd benchmark snippet shows `etcdctl ... check perf` referencing certificates at `/etc/kubernetes/pki/etcd/...`. On Talos Linux the etcd PKI is managed by Talos and lives under `/system/secrets/etcd/` on controlplane nodes (accessible via `talosctl read`), not in the kubeadm-style `/etc/kubernetes/pki/etcd/` path. The example is still valid as an illustration of the etcdctl invocation, but readers will need to retrieve the certs via `talosctl` (e.g. `talosctl --nodes <ip> read /system/secrets/etcd/ca.crt`) and mount them into the pod for the command to work end-to-end. Not corrected because the example is presented as a syntax template rather than a copy-paste-ready command.
- The `kubectl run` example for `api-bench` and `etcd-bench` relies on the in-cluster ServiceAccount having sufficient RBAC (list nodes, talk to etcd). Likewise the `k6-api-bench` Job references `serviceAccountName: benchmark-sa` without showing the SA / RBAC manifest. These are reasonable omissions for a guide of this scope but worth flagging.
- `--restart=Never` is used with `kubectl run` throughout. In current kubectl versions `kubectl run` always creates a Pod (the `--restart` flag now only sets `restartPolicy`), so the examples remain correct, but a future kubectl could deprecate this flag entirely.
- The "Typical good performance numbers" table uses sensible reference values for modern hardware (10 GbE NICs, NVMe, eBPF CNI). They are reasonable order-of-magnitude targets, not hard guarantees, which the surrounding prose makes clear.
- The `networkstatic/iperf3` and `networkstatic/netperf` images are widely used community images; the `--command -- netserver` form for netperf is correct. The iperf3 client examples pass the command via `-- iperf3 -c ...` (args, not command), which works with the `networkstatic/iperf3` image's CMD-based entrypoint convention used in the README's accompanying server YAML.
