# Validation Summary: Validating Multi-Stream Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- iperf3
- Prometheus
- Bash
- jq
- Kubernetes Jobs

## Sources Consulted
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- iperf3 official documentation and manual page: https://software.es.net/iperf/invoking.html
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- Docker Hub `networkstatic/iperf3` Dockerfile: https://hub.docker.com/r/networkstatic/iperf3/dockerfile

## Issues Found
- The introduction stated that each additional stream adds another CPU core and NIC queue. iperf3 documents that `-P` creates parallel client streams and, beginning with iperf 3.16, a separate thread for each test stream; CPU core and NIC queue placement depends on affinity, RSS, and queue steering. Updated the wording to avoid an overbroad claim.
- The cross-node `kubectl run --overrides` examples omitted `apiVersion`, while the current Kubernetes reference documents `--overrides` as inline JSON that should supply a valid `apiVersion`. Added `"apiVersion":"v1"` to both override snippets.
- The cross-node client used `-it` in a script and piped the output to `jq`. Allocating a TTY can fail or alter output in non-interactive CI contexts. Changed it to `-i`.
- The cross-node matrix deleted `matrix-server` without waiting, which could race with the next loop iteration and cause an already-exists error. Added `--wait=true`.
- The statistical Job used `networkstatic/iperf3` but called `jq` inside the container. The published Dockerfile installs `iperf3` only. Added an `apt-get install -y jq` step before the validation loop.
- The prerequisites implied `jq` must be available in the iperf container images. Tightened this to require `iperf3` in the test containers and `jq` only wherever JSON output is parsed.
- The verification section queried `cilium_multi_stream_throughput_bps`, implying a built-in Cilium metric. Cilium documents Cilium and Hubble metrics, but this benchmark throughput metric would need to be exported by the validation pipeline. Updated the command to query a pipeline-owned `multi_stream_throughput_bps` metric if one is exported.
- The worker-node prerequisite assumed the `node-role.kubernetes.io/worker` label exists. Added a note that the nodes should be labeled accordingly or the selector should be adjusted.

## Review Notes
The scripts remain examples and still assume that `iperf-server`, `iperf-client`, `perf-client`, and the Prometheus endpoint already exist in the expected namespaces. The throughput thresholds and example 25G NIC numbers are environment-specific acceptance criteria rather than universal Cilium guarantees.
