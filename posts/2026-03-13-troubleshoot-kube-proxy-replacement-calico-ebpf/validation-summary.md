# Validation Summary: How to Troubleshoot Kube-Proxy Replacement with Calico eBPF

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico eBPF data plane
- Kubernetes Services
- kube-proxy replacement
- eBPF / BPF maps
- Direct Server Return (DSR)
- iptables
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The prerequisites listed Linux kernel 5.3+ and Calico v3.15+. Current Calico documentation requires Linux kernel 5.10+ for the base eBPF data plane, or a supported distribution kernel with required eBPF backports. Updated the prerequisite text to match current Calico requirements without pinning an obsolete Calico minimum.
- The post implied kube-proxy can always be safely disabled. Calico documentation notes platform-specific limitations and conflict-avoidance settings, especially where kube-proxy cannot be disabled. Updated the prerequisite to mention disabling kube-proxy or configuring Calico to avoid kube-proxy cleanup conflicts.
- The eBPF enablement command only used `bpfEnabled`, which applies to manifest-based installs. Current operator-managed installs use the `Installation` resource with `linuxDataplane: BPF`, and the automatic kube-proxy replacement flow also uses `bpfNetworkBootstrap` and `kubeProxyManagement`. Added the operator-managed command and clarified the manifest-based alternative.
- The BPF service map command used `calico-node -bpf-nat-dump`, which is not the current documented syntax. Updated it to `calico-node -bpf nat dump` and added a command to identify a `calico-node` pod.
- The post described DSR as a LoadBalancer-service feature and said it eliminates asymmetric routing. Calico documents DSR for external service forwarding and requires the network fabric to allow one node to respond on behalf of another; DSR can create an asymmetric return path. Updated the description and section heading accordingly.
- The Mermaid diagram labeled constant-time lookup as `O1`. Updated it to `O(1)`.

## Review Notes
The local environment did not have `kubectl` or `calicoctl` installed, so command behavior was validated against official Calico and Kubernetes-compatible documentation rather than local CLI help. Future revisions could add a short note that DSR compatibility varies by cloud load balancer and is not suitable for all external LoadBalancer paths.
