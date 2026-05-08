# Validation Summary: Validating Connection Rate (TCP_CRR) in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- netperf TCP_CRR and TCP_RR
- iperf3
- Bash scripting
- Prometheus
- eBPF connection tracking and NAT maps

## Sources Consulted
- Netperf manual, "Care and Feeding of Netperf 2.7.X": https://hewlettpackard.github.io/netperf/doc/netperf.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- iperf3 invocation manual: https://software.es.net/iperf/invoking.html

## Issues Found
- The baseline and sustained TCP_CRR scripts parsed the first field from default netperf output. In normal verbosity, the final result is tabular and the first field is not the transaction rate. Changed the commands to use netperf `-P 0 -v 0`, which the netperf manual documents as emitting the single figure of merit, then parse that value.
- The Cilium BPF map inspection commands used the older `cilium bpf ...` form with `global`. Current Cilium command reference documents `cilium-dbg bpf ct list` and `cilium-dbg bpf nat list`; updated the examples to run those commands through the Cilium DaemonSet.
- The statistical analysis script used `awk` `asort()`, which is a GNU awk extension and fails on non-GNU awk implementations. Updated the snippet to sort the sample file before passing it to standard awk.

## Review Notes
- The post's fixed acceptance thresholds are example values and remain environment-dependent; production users should calibrate them against their hardware, kernel, Cilium configuration, and test placement.
- The NodePort netperf example assumes the netserver control port is exposed through the NodePort service.
