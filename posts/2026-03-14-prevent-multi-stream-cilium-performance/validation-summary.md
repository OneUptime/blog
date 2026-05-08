# Validation Summary: Preventing Multi-Stream Performance Degradation in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CronJobs and DaemonSets
- Prometheus, PrometheusRule, PromQL, and Pushgateway
- Grafana monitoring workflows
- iperf3
- Linux networking and ethtool
- Bash shell scripting, curl, jq, and bc

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus Pushgateway usage guidance: https://prometheus.io/docs/practices/pushing/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium performance and scalability documentation: https://docs.cilium.io/en/stable/operations/performance/
- iperf3 upstream project documentation: https://github.com/esnet/iperf
- networkstatic/iperf3 Docker image documentation: https://hub.docker.com/r/networkstatic/iperf3/
- ethtool Linux manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- curl manual page: https://curl.se/docs/manpage.html

## Issues Found
- The CronJob used the `networkstatic/iperf3` image while the script also called `jq` and `curl`. The referenced image is built to run iperf3 and does not install those extra tools. Changed the example to use `alpine:3.19` and install `curl`, `iperf3`, and `jq` before running the benchmark.
- The CronJob pushed one `cilium_multi_stream_throughput_bps` sample per loop iteration to the same Pushgateway grouping key. Pushgateway POST updates metrics by name within a group, so pushing each stream separately can replace earlier samples for the same metric name. Changed the script to write all stream samples to a temporary metrics file and push the group once.
- The configuration validator DaemonSet used `busybox:1.36` while calling `ethtool`, which BusyBox does not provide. Changed the image to `alpine:3.19` and installed `ethtool` before the validation loop.
- The validator hard-coded `eth0` in every command. Added an `INTERFACE` environment variable so the manifest remains correct for clusters where the host-facing interface can be configured without editing every command.

## Review Notes
The Kubernetes resource API versions, PrometheusRule shape, iperf3 flags, curl options, Prometheus query API usage, PromQL expressions, and ethtool command flags are technically valid. The NIC queue and RX ring targets are still environment-dependent; operators should confirm supported channel and ring limits for their NIC and driver before applying automatic changes in production.
