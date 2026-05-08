# Validation Summary: Preventing Baseline Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CronJobs
- Prometheus Operator PrometheusRule resources
- Prometheus Pushgateway
- Flux HelmRelease resources
- iperf3
- netperf
- Bash scripting

## Sources Consulted
- Cilium CNI Performance Benchmark: https://docs.cilium.io/en/stable/operations/performance/benchmark/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/latest/operations/performance/tuning/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Docker Hub `networkstatic/iperf3` Dockerfile: https://hub.docker.com/r/networkstatic/iperf3/dockerfile
- iperf3 command documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The CronJob used `networkstatic/iperf3` but the script also required `jq` and `curl`. The referenced Dockerfile installs only `iperf3`, so the job would fail at runtime. Changed the image to `alpine:3.22` and installed `iperf3`, `jq`, and `curl` in the command before running the benchmark.
- The prerequisites omitted `jq`, `bc`, and `curl`, even though later examples depend on them. Added those tools to the prerequisites.
- The Pushgateway example used a here-document inside a YAML block, which is easy to break and did not fail the job if the push failed. Replaced it with `printf` piped to `curl --fail`.
- The troubleshooting section stated that tunnel mode adds significant overhead as an absolute claim. Cilium's routing documentation supports native routing as the higher-performance path, but the exact overhead depends on environment and workload. Reworded this to "can add overhead compared with native routing."
- The Flux HelmRelease example pinned the Cilium chart to `1.14.x`, an old minor line, despite the prerequisite saying Cilium `v1.14+`. Changed it to the semver range `>=1.14.0 <2.0.0`.
- The Flux HelmRelease example referenced a `cilium-values` ConfigMap without specifying `valuesKey`. Flux defaults `valuesKey` to `values.yaml`, which may not match a generated key named `cilium-values.yaml`. Added `valuesKey: cilium-values.yaml`.
- The snapshot scripts used unquoted path variables and the post-change script did not validate its required argument. Quoted the generated paths and added a usage check for the required pre-change snapshot directory.

## Review Notes
The remaining examples assume that benchmark client and server pods or services already exist, such as `iperf-server.monitoring`, `perf-client`, and `netperf-server.monitoring`. That is consistent with the guide's high-level operational focus, but a future revision could include minimal manifests for those benchmark endpoints.
