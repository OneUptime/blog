# Validation Summary: How to Configure Calico eBPF Mode with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- eBPF
- IPv6
- Kubernetes
- kube-proxy
- Helm
- `bpftool`
- `iperf3`

## Sources Consulted
- Calico docs: Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico docs: Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico docs: Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico docs: Installation reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico docs: IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico docs: Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico docs: Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico docs: Install using Helm: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico docs: Overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip

## Issues Found
- The original post mixed a manifest-based install (`calico.yaml`) with operator-only commands such as `kubectl patch installation default`. I replaced the install steps with a single operator-based Helm flow so the later `Installation` patches are valid.
- The prerequisite versions were outdated and incomplete. I updated them to match current Calico eBPF support guidance, including the supported kernel/distribution guidance, the Kubernetes datastore requirement, Calico IPAM, IPv6 forwarding, and the kube-proxy IPVS caveat.
- The original eBPF enablement snippet only set `linuxDataplane: BPF` and manually disabled kube-proxy, but it omitted the recommended operator settings for automatic API server bootstrap and kube-proxy management on self-managed clusters. I changed the patch to include `bpfNetworkBootstrap` and `kubeProxyManagement`.
- The original verification command used `calico-node -felix-live` to look for BPF state. That is not the documented way to confirm the eBPF dataplane. I replaced it with the documented Felix log check for `BPF enabled, starting BPF endpoint manager and map manager.`
- The IPv6 IP pool example was technically wrong for the documented flow. It used a standalone `IPPool` object even though the post was using an operator-managed install, and it claimed `vxlanMode: Never` because “eBPF uses native routing,” which is misleading. I replaced it with an operator-managed `Installation` patch using an IPv6-only pool with `encapsulation: VXLAN`, `blockSize: 122`, and `natOutgoing: Enabled`.
- The original pool verification used `calicoctl` from inside a `calico-node` pod. That is not a documented or reliable way to manage/view Calico resources. I replaced it with `kubectl get ippools -o yaml`.
- The kube-proxy replacement section patched the wrong resource (`calico-config` in `kube-system`) and set `bpfKubeProxyIptablesCleanupEnabled` to `true`, which is the opposite of the documented setting when kube-proxy must remain running. I corrected this to a `FelixConfiguration` patch that sets `bpfKubeProxyIptablesCleanupEnabled: false` and moves the BPF kube-proxy health port to `10258`.
- The post used outdated `calico-node -bpf-dump-maps` commands. I replaced them with the currently documented `calico-node -bpf` subcommands such as `nat dump` and `conntrack dump`, and updated the `bpftool` examples to run inside the `calico-node` pod.
- The original `iperf3` client command used an invalid placeholder (`[fd00:10:244::server]`). I replaced it with a valid IPv6 address example and added a note to substitute the actual server pod IP.
- The original performance section made specific throughput claims and an `XDP mode` claim that were not supported by the official docs for a generic cluster. I replaced those with accurate caveats from Calico’s documentation: performance depends on kernel, NIC, MTU, and overlay usage, and VXLAN is the recommended overlay if an overlay is required in eBPF mode.

## Review Notes
- The updated eBPF enablement snippet is specifically the recommended operator-managed path for self-managed `kubeadm`-style clusters. Managed platforms may require the manual `kubernetes-services-endpoint` ConfigMap flow described in Calico’s eBPF install guide.
- The examples were updated against the current Calico documentation stream, which references Calico `v3.32.0` in the Helm and eBPF installation examples as of 2026-05-06.
