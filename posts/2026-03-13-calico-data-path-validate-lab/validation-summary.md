# Validation Summary: How to Validate the Calico Data Path in a Lab Cluster

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Linux iptables
- Linux eBPF and tc
- bpftool
- tcpdump
- VXLAN

## Sources Consulted
- Calico documentation: The Calico data path: IP routing and iptables - https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: System requirements / network requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local CLI help: `iptables --help`, `tc filter help`, `bpftool prog help`, `tcpdump --help`

## Issues Found
- The VXLAN validation captured on `vxlan.calico` while expecting VXLAN outer headers. On Linux, the encapsulated UDP/VXLAN packet should be captured on the node underlay interface with a UDP port 4789 filter; `vxlan.calico` is useful for decapsulated pod traffic. Updated the command and expected result accordingly.
- The traffic-generation examples used `wget` to a pod IP, which assumes the target pod is running an HTTP server. Replaced those examples with `ping` so the validation works with a packet-generation test client without requiring an application listener.
- The prerequisites described a single test pod running `nicolaka/netshoot`, but the commands use a `test-client` pod to generate traffic toward a target pod. Clarified that the netshoot pod is the test client.
- The best-practice note recommended iptables chain checks after every policy change without qualifying the dataplane mode. Updated it to apply specifically to iptables mode.

## Review Notes
The remaining commands and explanations are technically consistent with Calico's current standard Linux dataplane and eBPF dataplane documentation. In eBPF mode, Calico's own `calico-node -bpf` troubleshooting commands can provide deeper policy counters than raw `tc` and `bpftool` inspection, but the existing checks are still valid as low-level attachment verification.
