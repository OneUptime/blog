# Validation Summary: How to Benchmark Cilium CNI Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium CNI
- Kubernetes
- kubectl
- netperf and netserver
- iperf3
- eBPF and XDP
- VXLAN, native routing, WireGuard encryption, and kube-proxy replacement

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium CNI Performance Benchmark documentation: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/latest/network/kubernetes/kubeproxy-free/
- Netperf 2.7.x manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- iperf3 official documentation: https://software.es.net/iperf/invoking.html
- networkstatic/iperf3 Dockerfile: https://hub.docker.com/r/networkstatic/iperf3/dockerfile
- networkstatic/netperf Docker Hub page: https://hub.docker.com/r/networkstatic/netperf

## Issues Found
- The netperf server pod used the `networkstatic/netperf` image and attempted to pass `netserver -D` as arguments. The `networkstatic/netperf` image is intended for the netperf client entrypoint, so this would not correctly start the server. Changed the server image to `networkstatic/netserver` and passed only `-D`.
- The netperf client pod attempted to run `sleep infinity` without `--command`, which would pass those words as arguments to the image entrypoint rather than overriding it. Added `--command -- sleep infinity` so the pod stays alive for later `kubectl exec` netperf runs.
- The iperf3 server and client examples included `iperf3` after `--` even though `networkstatic/iperf3` already uses `iperf3` as its entrypoint. Removed the duplicate executable name and passed only iperf3 arguments (`-s` and `-c ...`).
- The comparison table used fixed percentage expectations for VXLAN, native routing, and WireGuard. These percentages are environment-dependent and are not guaranteed by the official documentation. Replaced them with qualitative expectations that accurately describe the relevant overheads.
- The conclusion claimed that native routing with kube-proxy replacement delivers the best performance in most environments. Reworded it to avoid an unsupported universal claim and describe the specific overheads those options can reduce.

## Review Notes
The commands are valid kubectl patterns, but benchmark results will vary significantly based on kernel version, NICs, offloads, MTU, CPU limits, Cilium version, routing mode, encryption settings, and whether the test path is direct pod-to-pod traffic or service load-balanced traffic. For repeatable production benchmarking, Cilium's official documentation uses kubenetbench with controlled bare-metal test conditions.
