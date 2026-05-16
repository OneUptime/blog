# Validation Summary: How to Set Up Traffic Shaping on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes Pods and DaemonSets
- Kubernetes bandwidth annotations
- CNI bandwidth plugin
- Cilium bandwidth manager
- Linux traffic control (`tc`), HTB, TBF, fq_codel, ingress policing, IFB
- iptables DSCP marking
- Linux networking sysctls

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/
- Calico QoS Controls documentation: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Local `tc` help output from iproute2 6.1.0 for qdisc, HTB, fq_codel, and u32 filter syntax.

## Issues Found
- The post said Kubernetes bandwidth annotations are supported by most CNI plugins. Kubernetes documents these annotations as experimental traffic shaping support that requires the upstream `bandwidth` plugin or equivalent CNI-specific support. I changed the wording to say the annotations work when the CNI configuration supports them.
- The post described the bandwidth CNI plugin too generally and implied it only creates tc rules on the pod virtual ethernet interface. The CNI bandwidth plugin uses TBF qdiscs and IFB devices for ingress shaping, so I updated the explanation.
- The verification example used `tc -s class show dev eth0` for pod bandwidth annotations. The upstream bandwidth plugin uses qdiscs rather than HTB classes, and `eth0` on the node is not necessarily a pod interface. I changed the command to `tc -s qdisc show` and clarified what to look for.
- The general ingress explanation said incoming traffic can only be policed. That is true for a plain ingress qdisc, but ingress shaping is possible through IFB redirection or CNI/eBPF implementations. I updated the explanation to include that caveat.
- The Cilium section stated that the bandwidth manager uses EDT without distinguishing ingress and egress. Cilium documents EDT for egress and an eBPF token bucket for ingress, so I corrected the sentence.
- The DaemonSet troubleshooting section implied rules are tied to whether the DaemonSet pod is currently running. The tc rules are configured by the init container and persist until changed or the node reboots; init containers also do not rerun for an ordinary app container restart. I updated the wording to describe the actual lifecycle.

## Review Notes
The remaining examples are intentionally illustrative. Interface names such as `eth0`, bandwidth values, Cilium Helm source configuration, and DSCP policies should be adapted to the target cluster and network hardware.
