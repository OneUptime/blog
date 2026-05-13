# Validation Summary: How to Migrate to IPVS Mode with Calico Safely

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS
- Calico
- Linux kernel modules
- kubectl
- ipvsadm

## Sources Consulted
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Calico Use IPVS kube-proxy documentation: https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Calico eBPF documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Linux kmod modprobe help output from the local environment

## Issues Found
- The post described IPVS as generally superior without noting that Kubernetes v1.35 marks IPVS proxy mode as deprecated and recommends nftables mode for modern Linux clusters. I added that caveat in the introduction and conclusion.
- The `modprobe` command passed multiple module names without `-a`, while the local `modprobe --help` usage requires `-a` for multiple modules. I changed it to `modprobe -a ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh nf_conntrack`.
- The prerequisites omitted Linux nodes, `nf_conntrack`, and `ipvsadm`, all of which are relevant to the provided commands and kube-proxy IPVS verification. I added them.
- The migration steps restarted kube-proxy but omitted Calico's requirement to restart `calico-node` after changing kube-proxy mode in a running cluster so Calico can re-detect IPVS mode. I added a `calico-node` rollout restart with a namespace caveat.
- The verification section implied IPVS entry counts should be compared directly with Service object counts. Kubernetes documents that kube-proxy creates IPVS virtual servers per service port and may include NodePort, external IP, and load-balancer entries, so I clarified that this is not a one-to-one match.
- The Mermaid diagram used `O1` instead of `O(1)` and labeled Calico as `eBPF/iptables`. Calico eBPF mode is a kube-proxy replacement rather than the normal kube-proxy IPVS integration path, so I changed the label to `Calico routing/policy`.

## Review Notes
The post is technically relevant and the corrected commands are appropriate for a generic Calico cluster using kube-proxy IPVS mode. Future updates should consider whether the post should recommend nftables mode instead of IPVS for Kubernetes versions where nftables is stable and supported by the chosen network plugin.
