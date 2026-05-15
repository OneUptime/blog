# Validation Summary: How to Configure Kubernetes Networking with Calico CNI on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubeadm
- kubectl
- Calico CNI
- Tigera Operator
- calicoctl
- Kubernetes NetworkPolicy
- Calico IPPool
- firewalld

## Sources Consulted
- Calico documentation: Install Calico networking and network policy for on-premises deployments - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: System requirements for Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- firewalld documentation: firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Project Calico v3.27.0 manifests on GitHub - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/

## Issues Found
- The operator installation used the v3.27.0 `custom-resources.yaml` directly after recommending `kubeadm init --pod-network-cidr=192.168.0.0/16`. This is correct only when the pod CIDR matches the custom resource's default IP pool CIDR. I added a note to download and edit `spec.calicoNetwork.ipPools[0].cidr` before creating the resource if the cluster uses a different pod CIDR.
- The IPPool section described creating a pool for a "specific namespace or workload." Calico IPPool selection is based on IPAM configuration such as `nodeSelector`, `allowedUses`, `assignmentMode`, and explicit workload IP annotations, not a namespace field in the shown resource. I changed the comment to say the pool applies to workloads on matching nodes.
- The firewall section stated that a fixed set of ports is required on all RHEL nodes. Calico's network requirements depend on the selected dataplane and routing/encapsulation mode, and the Calico docs also warn that firewalld or other iptables managers can interfere with Calico. I changed the text to make these rules mode-specific, added IP-in-IP as protocol traffic, changed the Calico API comment to the kube-apiserver secure port, and clarified Typha/BGP/VXLAN are conditional.

## Review Notes
- The post pins Calico v3.27.0. The commands are valid for that version, but Calico has newer releases and the current documentation uses newer manifest URLs. Consider updating the version in a future content refresh.
- The simple manifest method installs Calico resources in `kube-system`, while the operator method uses Calico-managed namespaces such as `calico-system`; the post correctly shows separate verification commands for those modes.
