# Validation Summary: Install Cilium on Broadcom VMware ESXi

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Cilium
- Kubernetes
- kubeadm
- Helm
- VMware ESXi / vSphere
- VXLAN
- Hubble
- CiliumNetworkPolicy
- eBPF

## Sources Consulted
- Cilium 1.15 routing documentation: https://docs.cilium.io/en/v1.15/network/concepts/routing/
- Cilium 1.15.0 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.15.0/install/kubernetes/cilium/values.yaml
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer3/
- Broadcom ESXCLI command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

## Issues Found
- The VMware portgroup security guidance implied promiscuous mode, MAC address changes, and forged transmits were required for Cilium VXLAN. Cilium VXLAN requires node-to-node connectivity and UDP 8472; the VMware MAC-related settings are only needed for modes that emit non-vNIC MAC addresses. Updated the prerequisites, setup text, and best practices accordingly.
- The Cilium Helm values used the deprecated `tunnel: vxlan` key. Replaced it with `routingMode: tunnel` and `tunnelProtocol: vxlan`, which are valid chart values for Cilium 1.15.0.
- The post enabled `kubeProxyReplacement: true` in a standard kubeadm flow without disabling kube-proxy. Changed the example to keep kube-proxy enabled by setting `kubeProxyReplacement: false`.
- The post used `bpf.hostRouting`, which is not a valid Cilium 1.15.0 Helm value. Removed it and kept `bpf.masquerade`, which is valid.
- The MTU best practice recommended 1450 but the sample values file did not set it. Added `MTU: 1450` to match the stated VXLAN-over-1500-underlay guidance.
- The kubeconfig setup copied `/etc/kubernetes/admin.conf` without changing ownership. Added the `sudo chown $(id -u):$(id -g) $HOME/.kube/config` step from the kubeadm documentation.
- The CiliumNetworkPolicy example used `fromRequires`, which is deprecated in Cilium 1.17 and removed in Cilium 1.19. Replaced it by matching the monitoring namespace label directly in `fromEndpoints`.
- The verification step ran `hubble observe` without listing the Hubble CLI as a prerequisite. Added the Hubble CLI prerequisite.
- The post called `cilium hubble enable` after already enabling Hubble through Helm values. Removed the redundant command and kept the port-forward and observe steps.

## Review Notes
- The installation still pins Cilium chart version `1.15.0`, which is technically valid for the example but old. Future updates should consider using a currently supported Cilium release and retesting the Helm values against that release.
