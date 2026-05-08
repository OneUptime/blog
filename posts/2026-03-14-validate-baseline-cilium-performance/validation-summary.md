# Validation Summary: Validating Baseline Performance in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- iperf3
- netperf
- Bash
- jq
- awk
- Prometheus
- Grafana

## Sources Consulted
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium latest Performance Tuning Guide: https://docs.cilium.io/en/latest/operations/performance/tuning/
- Cilium CLI status reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes safely drain a node task: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- ESnet iperf3 invocation documentation: https://software.es.net/iperf/invoking.html
- iperf3 user documentation: https://d2cpnw0u24fjm4.cloudfront.net/wp-content/uploads/iPerf3-User-Documentation.pdf
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- Intel Ethernet Linux Performance Tuning Guide, netperf section: https://edc.intel.com/content/www/us/en/design/products/ethernet/perf-tuning-guide-800-series-linux/1.4/%E2%80%8Bnetperf/

## Issues Found
- The netperf parsing commands used `awk '{print $1}'`, which extracts the first column from the final netperf output line rather than the reported transaction rate. Changed both TCP_RR and TCP_CRR examples to print `$NF`, the final field containing the rate.
- The `kubectl drain node-test-1 node-test-2` example passed two node names to a command documented for draining one node at a time. Changed it to loop over the two nodes and drain each node separately.
- The statistical analysis snippet used GNU awk's `asort()` while invoking plain `awk`, which can fail on systems where `awk` is not GNU awk. Changed the pipeline to `sort -n | awk` and removed the `asort()` dependency.
- The conclusion listed XDP acceleration as part of an optimal pod-to-pod throughput configuration and stated a fixed 90-98% expected efficiency. Cilium documentation describes XDP acceleration for NodePort, LoadBalancer, and externalIP service acceleration, not as a generic pod-to-pod throughput accelerator. Reworded the conclusion to focus on native routing and BPF host routing and to state that exact efficiency depends on environment and test parameters.

## Review Notes
- The iperf3 options used in the examples (`-c`, `-t`, `-P`, and `-J`) are current and documented.
- The `kubectl drain --ignore-daemonsets --delete-emptydir-data` flags are current. Draining may still require additional flags such as `--force` in clusters with unmanaged pods, but the existing example is valid for controlled test nodes.
- The acceptance criteria values are environment-specific examples rather than universal Cilium guarantees; teams should calibrate them against their own hardware and workload profile.
