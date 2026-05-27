# Validation Summary: Comparing Kubernetes CNI Plugins: Calico, Cilium, Flannel, and Weave

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Calico
- Cilium
- Flannel
- Weave Net
- Kubernetes NetworkPolicy
- eBPF
- BGP
- VXLAN
- WireGuard
- IPsec
- kubectl

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI specification repository: https://github.com/containernetworking/cni
- Calico on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico eBPF data plane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Cilium quick installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium system requirements: https://docs.cilium.io/en/latest/operations/system_requirements/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium introduction and L7 policy documentation: https://docs.cilium.io/en/stable/intro/
- Flannel project documentation: https://github.com/flannel-io/flannel
- Weave Net repository: https://github.com/weaveworks/weave
- Weave Net release page: https://github.com/weaveworks/weave/releases

## Issues Found
- The Calico section described BGP/direct routing as if it were always how Calico operates. Calico supports BGP and direct routing, but it can also be configured with overlays such as IPIP or VXLAN. I updated the wording to say Calico supports BGP and can avoid overlays when configured for direct routing.
- The Calico install commands were pinned to v3.27.0 and omitted the current separate CRD manifest used by the operator installation flow. I updated the commands to Calico v3.32.0, added the `v1_crd_projectcalico_org.yaml` step, and changed the custom resources step to download and apply the local file after review.
- The Cilium CLI install snippet did not follow the current official installation flow and skipped checksum verification. I updated it to use `stable.txt`, choose the architecture, download the matching checksum, verify it, install the binary, and remove the downloaded artifacts.
- The Cilium description and feature list claimed that Cilium has no iptables overhead or bypasses iptables entirely. Current Cilium deployments can avoid much of the traditional iptables path, especially with kube-proxy replacement and BPF features, but some configurations still use iptables-related functionality. I softened the claims to avoid overstating the behavior.
- The Cilium kernel requirement was written as only `5.10+`. Official Cilium requirements also allow distribution-equivalent kernels such as RHEL's 4.18-based kernel. I updated the recommendation to mention distribution-equivalent kernels.
- The Weave Net section presented Weave as a current general recommendation. The upstream `weaveworks/weave` repository was archived on June 20, 2024, and the latest upstream release is v2.8.1 from January 25, 2021. I added legacy wording and changed the recommendation bullets to focus on existing or legacy Weave Net deployments.
- The Weave Net section claimed CRDT-based data synchronization for handling partitions. I did not find authoritative Weave Net documentation supporting that claim. I replaced it with peer discovery and distributed IP address allocation, which matches Weave Net's documented architecture more closely.

## Review Notes
- The remaining performance ranking is a high-level guideline rather than a benchmark. Real results depend heavily on kernel version, routing mode, encapsulation, kube-proxy replacement, encryption, hardware offload, and workload traffic patterns.
- The Weave Net install URL still points to the archived upstream release and is plausible for legacy clusters, but new production deployments should generally prefer an actively maintained CNI.
