# Validation Summary: Diagnosing Baseline Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF
- XDP
- iperf3
- netperf
- bpftool
- bpftrace

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg endpoint list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg bpf ct list` reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list.html
- Cilium Hubble setup and port-forward documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Linux kernel XDP redirect tracing documentation: https://docs.kernel.org/bpf/redirect.html

## Issues Found
- The host TCP_RR baseline started only a netperf client. Added a host-network `netserver` pod on the target node before running the `netperf` client.
- The pod-to-pod iperf example executed into an undefined `pod-iperf` pod. Changed it to start an iperf server pod, discover its pod IP, and run an ephemeral iperf client pod.
- The CNI overhead calculation used literal `X` and `Y` symbols inside `bc`, which would not evaluate. Replaced them with shell variables for host and pod throughput.
- The baseline metrics script tried to `kubectl exec` into short-lived benchmark pods that were previously run with `--rm`. Changed the loop to create ephemeral netperf client pods for each metric and added a pod `netserver` for pod baseline tests.
- The diagnostic commands used `cilium bpf` and `cilium endpoint` from the cluster Cilium CLI. Current Cilium command references expose local agent datapath inspection through `cilium-dbg`, so the examples now select a Cilium agent pod and run `cilium-dbg` via `kubectl exec`.
- The monitor examples used `cilium monitor`, while the current Cilium docs document this as `cilium-dbg monitor`. Updated the text and commands accordingly.
- The bpftrace XDP example referenced `args->action`, which is not the documented field for XDP redirect error tracepoints. Updated it to aggregate redirect errors by `args->err`.
- The conclusion gave a fixed 90-98% pod-to-host throughput expectation and included XDP acceleration in a pod-to-pod baseline statement. Reworded it to the more accurate claim that optimized native routing and BPF host routing can approach the host baseline, with actual results depending on environment.

## Review Notes
The commands are still examples and require real node names, host IPs, a running Kubernetes cluster, Cilium installed in `kube-system`, and benchmark images available to the cluster. I could not execute the Kubernetes or Cilium commands locally because the required CLIs and cluster context are not present in this workspace.
