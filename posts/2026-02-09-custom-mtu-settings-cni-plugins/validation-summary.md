# Validation Summary: How to Configure Custom MTU Settings for CNI Plugins in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- CNI plugins
- Calico
- Cilium
- Flannel
- Weave Net
- AWS VPC CNI / EKS
- Google GKE
- Azure CNI / AKS
- Linux MTU and Path MTU Discovery

## Sources Consulted
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium CLI config reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_set/
- Flannel running/configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/running.md
- Weave Net Kubernetes add-on documentation: https://rajch.github.io/weave/kubernetes/kube-addon.html
- Amazon VPC CNI configuration variables: https://github.com/aws/amazon-vpc-cni-k8s
- Google Cloud VPC and GKE MTU documentation: https://docs.cloud.google.com/vpc/docs/mtu
- Microsoft Azure Virtual Network CNI documentation: https://learn.microsoft.com/en-us/azure/virtual-network/deploy-container-networking
- Microsoft AKS Azure CNI Overlay documentation: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local `ping -h` output for `-M` and `-s` option verification

## Issues Found
- Cilium Helm examples used outdated or incorrect values (`tunnel=vxlan` and `mtu`). Updated them to current Helm values: `routingMode=tunnel`, `tunnelProtocol=vxlan`, and `MTU`.
- AWS VPC CNI examples used `ENI_MTU`, which is not the documented variable. Replaced it with `AWS_VPC_ENI_MTU` and added `POD_MTU` for pod virtual interface MTU.
- The AWS example enabled `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` unnecessarily for MTU tuning. Removed it because that variable controls custom subnet/security group networking, not MTU.
- The AKS section showed an unsupported `azure-cni-config` ConfigMap with an `mtu` field for `azure-vnet`. Replaced it with guidance to verify the effective MTU from a pod or node.
- The IPv6 PMTUD command used nonexistent Linux sysctl `net.ipv6.conf.all.disable_ipv6_pmtud`. Replaced it with guidance to allow ICMPv6 Packet Too Big messages.
- Cilium jumbo frame and auto-detection examples used lowercase `mtu`. Updated them to `MTU`, and simplified auto-detection to `MTU=0`.
- Calico auto-detection verification used `calicoctl node status`, which reports node/BGP status rather than the operator MTU. Replaced it with a query of the Calico operator `Installation` status MTU.

## Review Notes
The remaining examples are generally accurate but version- and installation-method dependent. CNI MTU changes often affect only newly created pods or require rolling restarts, so production procedures should include workload recreation or rollout validation.
