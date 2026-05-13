# Validation Summary: How to Install Calico on Self-Managed Azure Kubernetes Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes and kubeadm
- Azure Virtual Machines
- Azure Network Security Groups
- VXLAN networking
- Calico network policies and global network policies
- calicoctl

## Sources Consulted
- Calico Open Source operator install guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Azure CLI NSG rule documentation: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure VM MTU documentation: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu
- Azure NIC IP forwarding documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface

## Issues Found
- The kubeadm kubeconfig setup omitted the `sudo chown $(id -u):$(id -g) $HOME/.kube/config` step. Added it so `kubectl` works for the non-root user, matching kubeadm's official post-init instructions.
- The Calico install command used the older v3.27.0 operator manifest and did not install the current separate Calico/operator CRD manifest. Updated the commands to v3.32.0 and added `v1_crd_projectcalico_org.yaml` before installing the Tigera Operator.
- The readiness command waited for `condition=Ready` on `tigerastatus/calico`, but TigeraStatus uses `Available`, `Progressing`, and `Degraded` conditions. Changed the wait condition to `Available`.
- The kubeadm pod CIDR comment implied Azure always uses `10.x.x.x/16`. Azure VNets are user-configurable, so the comment now correctly says to avoid overlap with the Azure VNet or service CIDR.
- The Calico `NetworkPolicy` example used `kubernetes.io/metadata.name` in a Calico `namespaceSelector`. Calico namespace selectors should use the automatic `projectcalico.org/name` label, so the example was corrected.

## Review Notes
- The Azure NSG commands use valid Azure CLI options and appropriate VXLAN/Typha ports for this Calico deployment pattern.
- The MTU guidance is consistent with Azure's 1500-byte default MTU and Calico VXLAN overhead guidance.
- The guide intentionally uses full VXLAN encapsulation. Calico also documents cross-subnet VXLAN as a performance optimization in some Azure VNet layouts, but full VXLAN is technically valid and avoids depending on subnet topology.
