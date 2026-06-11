# Validation Summary: How to Create Resource Exhaustion Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- stress-ng (CPU, memory, I/O, disk, network, fork stressors and job files)
- iperf3 (bandwidth saturation, bidirectional mode, JSON output)
- tc / netem (network latency injection with delay, jitter, correlation)
- Linux /proc filesystem (/proc/meminfo, /proc/loadavg, /proc/stat)
- mpstat (sysstat package)
- dd (disk fill with conv=fdatasync)
- Kubernetes (Pod, Job, PersistentVolumeClaim, resource requests/limits)
- LitmusChaos (ChaosEngine, pod-cpu-hog, pod-memory-hog experiments)
- Prometheus alerting (node_exporter, cAdvisor metrics, PromQL)
- Python 3 (`socket`, `requests`, `statistics.quantiles`, `concurrent.futures`, `subprocess`)
- Mermaid (flowchart for cascade visualization)

## Sources Consulted
- stress-ng man page and GitHub repository — https://github.com/ColinIanKing/stress-ng
- polinux/stress-ng on Docker Hub — https://hub.docker.com/r/polinux/stress-ng
- iperf3 documentation — https://software.es.net/iperf/
- tc-netem man page — https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Prometheus node_exporter metric reference — https://github.com/prometheus/node_exporter
- LitmusChaos pod-cpu-hog / pod-memory-hog docs — https://litmuschaos.github.io/litmus/experiments/categories/pods/
- Python 3 `statistics.quantiles` documentation — https://docs.python.org/3/library/statistics.html
- Linux man pages for df, dd, mpstat

## Issues Found
- The "stress-ng Comprehensive Configuration" section presented a fabricated YAML-based config file format and used `stress-ng --yaml CONFIG_FILE` as if it read the file. stress-ng's `--yaml` flag only **writes** YAML-formatted output statistics; it does not read configuration. Configuration is read via `--job FILE` using a plain-text, one-option-per-line format (no nested sections, no leading `--`). Rewrote the config block in the actual stress-ng job file syntax and updated the runner script to use `--job` for input.
- The runner script used `--metrics "$LOG_DIR/metrics_${TIMESTAMP}.json"`. stress-ng's `--metrics` and `--metrics-brief` are no-argument flags that print to stdout — they do not accept a filename and stress-ng has no JSON output format. Replaced with `--yaml "$LOG_DIR/metrics_${TIMESTAMP}.yaml"`, which is the supported way to capture per-stressor metrics to a file.

## Review Notes
- The `polinux/stress-ng:latest` image used in the Kubernetes Pod manifests is a real image on Docker Hub (1M+ pulls) with `/usr/bin/stress-ng` as entrypoint, but the latest publish is several years old and pinned to stress-ng v0.07.05. For newer features, readers may prefer building a current image from `ColinIanKing/stress-ng`.
- The Prometheus `HighNetworkUtilization` rule relies on `node_network_speed_bytes`, which node_exporter only populates when the underlying interface driver reports a link speed (it is empty for many virtual interfaces, including cloud ENIs in some environments). The expression is mathematically correct but may not fire as expected on all hosts.
- The disk-fill script uses `tr -d 'M'` on `df -BM` columns; `df -BM` already prints unsuffixed integers, so the `tr` is a harmless no-op rather than a bug.
- The `apt-get install -y coreutils` line in the Kubernetes disk-stress Job is redundant since `coreutils` ships in the `ubuntu:22.04` base image, but is not incorrect.
- `statistics.quantiles(latencies, n=20)[18]` and `statistics.quantiles(latencies, n=100)[98]` correctly compute the p95 and p99 respectively (n quantiles return n-1 cut points at indices 0..n-2).
