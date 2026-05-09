# Validation Summary: How to Test Native Routing with Calico eBPF with Live Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kube-proxy replacement
- FelixConfiguration
- kubectl
- calicoctl
- iperf3

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/

## Issues Found
- The introduction overstated eBPF as intercepting packets at the earliest possible point and bypassing broad parts of the kernel networking stack. Updated the wording to match Calico's documented eBPF dataplane behavior: replacing iptables-based service and policy processing with eBPF programs attached to low-level kernel hooks.
- The native routing explanation incorrectly implied eBPF mode itself eliminates VXLAN or IP-in-IP encapsulation. Updated it to clarify that unencapsulated native routing depends on the underlying network being able to route workload IPs directly.
- The kernel prerequisite listed Linux 5.3+ with 5.8+ recommended. Current Calico documentation requires Linux 5.10+ for the base eBPF dataplane, or RHEL 8.4 kernel 4.18.0-305 or later, with higher kernel versions needed for some features. Updated the prerequisite.
- The eBPF enablement command included an unnecessary merge patch type and an explicit `bpfDisableUnprivileged` setting. Replaced it with the documented Calico eBPF command that patches `bpfEnabled`.
- The verification command `calico-node -bpf-log-level Debug` was not a valid `calico-node -bpf` command. Replaced it with the documented `calico-node -bpf nat dump` flow using a selected `calico-node` pod.
- The verification examples targeted `ds/calico-node` directly. Updated them to select a concrete `calico-node` pod, matching Calico's documented troubleshooting examples.
- The architecture diagram labeled the hook as `XDP/TC hook`, which was too specific for the general Calico eBPF dataplane description. Changed it to `Kernel hook`.

## Review Notes
The benchmark commands are syntactically plausible for a simple pod-to-pod throughput smoke test, but a production-quality benchmark should control for node placement, CPU limits, test duration, parallel streams, and repeated runs before drawing performance conclusions.
