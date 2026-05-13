# Validation Summary: How to Migrate to Kube-Proxy Replacement with Calico eBPF Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF data plane
- Kubernetes Services
- kube-proxy
- Linux eBPF
- iptables
- Direct Server Return (DSR)
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: calicoctl patch reference, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: Felix configuration reference, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The prerequisites listed outdated and incomplete kernel guidance. Updated them to match current Calico eBPF support guidance and added Kubernetes datastore, direct API server access, kube-proxy cleanup conflict, and IPVS migration caveats.
- The migration steps used only the manifest-install `FelixConfiguration` method to enable eBPF. Added the operator-install `Installation` patch and kept the manifest method as the alternative.
- The `calicoctl patch` examples used `--type merge`, but Calico's current examples for these FelixConfiguration patches use the default patch behavior and the reference still marks JSON merge patch as not implemented. Removed `--type merge` from the `calicoctl` commands.
- The BPF NAT dump command used an invalid `calico-node -bpf-nat-dump` form and executed against a DaemonSet. Updated it to select a `calico-node` pod and run `calico-node -bpf nat dump`, matching Calico troubleshooting documentation.
- The DSR explanation was too broad for LoadBalancer services and incorrectly implied DSR eliminates asymmetric routing. Updated it to describe external service traffic, the direct return path, and the underlying network requirements.
- The Mermaid diagram label used `O1` instead of `O(1)`. Corrected the notation.
- The conclusion omitted the direct API server and IPVS migration requirements. Updated it to reflect the corrected migration conditions.

## Review Notes
The guide is now accurate as a concise migration overview, but production migrations should still follow the full Calico distribution-specific procedure because kube-proxy management differs across kubeadm, kOps, OpenShift, AKS, EKS, and MKE.
