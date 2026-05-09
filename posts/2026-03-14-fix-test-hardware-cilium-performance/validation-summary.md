# Validation Summary: Fixing Test Hardware Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux networking
- ethtool
- CPU frequency governors
- NUMA and IRQ affinity
- Helm
- Bash

## Sources Consulted
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium CLI `status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg endpoint list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium troubleshooting guide for drop monitoring: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Helm upgrade reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback reference: https://helm.sh/docs/helm/helm_rollback/
- Linux ethtool manual: https://man7.org/linux/man-pages/man8/ethtool.8.html
- Local `ethtool --help` output from ethtool 6.7

## Issues Found
- The NIC queue example used `ethtool -L eth0 combined $(nproc)`, which can exceed the NIC driver's supported maximum channel count. Changed it to read the pre-set maximum combined channel count from `ethtool -l eth0` before applying `ethtool -L`.
- The prerequisites omitted tools used by the examples. Added `ethtool`, `jq`, and `iperf3` to the prerequisites.
- The NUMA example assumed `/sys/class/net/eth0/device/numa_node` is always a valid node number. Added a fallback for `-1`, which Linux uses when the device has no NUMA node.
- The DaemonSet used `busybox:1.36` while running `ethtool`, which BusyBox does not provide. Changed the example to use Alpine and install `ethtool` before tuning.
- The validation checklist used `cilium monitor` and `cilium endpoint list`, but current Cilium documentation exposes these as agent-local `cilium-dbg` commands. Updated the commands to run `cilium-dbg monitor` and `cilium-dbg endpoint list` through `kubectl exec` against the Cilium DaemonSet.
- The drop-monitoring pipeline could fail to print the intended "No drops" message reliably. Reworked it to capture drop lines and print a no-drop message when none are found.

## Review Notes
The remaining hardware tuning commands are driver- and platform-dependent. Ring sizes, offload features, RSS hash fields, IRQ affinity masks, and CPU power settings may be rejected or ignored by some NICs, kernels, cloud instances, or BIOS configurations, so users should verify support on each node class before broad rollout.
