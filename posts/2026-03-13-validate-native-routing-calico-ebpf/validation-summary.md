# Validation Summary: How to Validate Native Routing with Calico eBPF

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kube-proxy replacement
- Linux eBPF and tc hooks
- bpftool
- calicoctl
- iperf3 benchmarking

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post listed Linux kernel 5.3+ with 5.8+ recommended. Current Calico documentation requires a supported distribution with kernel 5.10+ for the base eBPF dataplane, with RHEL 8.4 kernel 4.18.0-305+ as a supported backport case, and recommends kernel 6.6+ for all eBPF features. Updated the prerequisite.
- The post described Calico eBPF as intercepting packets at the earliest possible point and showed XDP/TC hooks. Calico documentation describes the dataplane as attaching eBPF programs to tc hooks on Calico, data, and tunnel interfaces, with XDP used in specific contexts. Updated the wording and diagram to avoid implying XDP is the normal dataplane hook.
- The post said eBPF native routing eliminates VXLAN or IP-in-IP encapsulation in many scenarios. Current Calico documentation says direct routing is best for pod-to-pod performance where the underlying network supports it, but VXLAN is still used for some service paths such as NodePort forwarding between nodes. Updated the explanation.
- The enablement command set `bpfDisableUnprivileged` explicitly. That field exists, but its documented default is already `true`; the command was simplified to the documented `bpfEnabled` patch.
- The verification command `calico-node -bpf-log-level Debug` was not a documented valid verification command. Replaced it with the documented log check for successful BPF startup and `calico-node -bpf nat dump`.
- The examples used `kubectl exec` against the DaemonSet directly. Calico troubleshooting documentation uses a specific calico-node pod name, so the commands now select a calico-node pod and exec into it.
- The iperf client command would create a pod but not reliably stream the benchmark result to the terminal. Updated it to wait for the server pod and run the client with `--rm -i --restart=Never`.

## Review Notes
The guide is now technically aligned with current Calico Open Source documentation. Future improvements could include adding operator-based enablement commands for clusters installed with the Tigera Operator, because that is the recommended path for many current Calico installations.
