# Validation Summary: Validating Single-Process Performance in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes CPU Manager and Guaranteed QoS
- Linux cgroups v1 and v2
- iperf3
- netperf
- Prometheus
- Kubernetes Jobs

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes node resource managers and CPU Manager documentation: https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes Pod QoS documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Cilium CNI performance benchmark documentation: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium bandwidth manager examples using cilium/netperf and iperf3: https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/
- Cilium connectivity performance test documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e/
- Netperf 2.7.x manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- iperf3 project documentation: https://github.com/esnet/iperf

## Issues Found
- The CPU isolation script used cgroup v1-only paths. I updated it to check cgroup v2 paths first (`/sys/fs/cgroup/cpuset.cpus.effective` and `/sys/fs/cgroup/cpu.stat`) and fall back to the cgroup v1 paths, matching current Kubernetes cgroup v2 guidance and Linux cgroup interfaces.
- The CPU isolation script referenced `SERVER_IP` without defining it. I added the same `kubectl get pod iperf-server` lookup used in the throughput script.
- The CPU throttling check assumed `nr_throttled` would always be present. I added an explicit failure when that counter is unavailable so the script does not silently pass an invalid throttling check.
- The netperf latency command requested `MEAN_LATENCY` without enabling netperf timing statistics. I added the global `-j` option and used the documented `THROUGHPUT,MEAN_LATENCY` output selectors.
- The CI Job used Bash arithmetic syntax while running under `/bin/sh`. I replaced those comparisons with POSIX-compatible `[ ... ]` checks.
- The verification section used `kubectl top` as a cluster-wide throttling check, but `kubectl top` reports current resource usage rather than CFS throttling events. I replaced it with a Prometheus query against `container_cpu_cfs_throttled_periods_total`.
- The prerequisites mentioned Prometheus generically even though it is only needed for the cluster-wide throttling query. I clarified that scope.

## Review Notes
The numeric thresholds in the examples are environment-specific rather than universal Cilium guarantees. The post now remains technically correct, but future revisions could make clear that throughput and latency acceptance criteria should be calibrated per NIC speed, host CPU, kernel, Cilium mode, MTU, and pod placement.
