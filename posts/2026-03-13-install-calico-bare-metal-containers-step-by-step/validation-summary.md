# Validation Summary: How to Install Calico on Bare Metal with Containers Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Kubernetes CNI
- BGP routing
- Calico IPAM and `calicoctl`
- containerd and CRI-O

## Sources Consulted
- Calico on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Calico operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Project Calico v3.32.0 manifests: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/custom-resources.yaml

## Issues Found
- The prerequisites listed Linux kernel 4.19+, but current Calico Open Source Kubernetes requirements specify Linux kernel 5.10 or later. Updated the prerequisite to 5.10+.
- The guide used Calico v3.27.0 manifest URLs. Updated the install commands to v3.32.0 to match the current official documentation.
- The on-premises operator installation step omitted `v1_crd_projectcalico_org.yaml`, which the current Calico on-premises documentation installs before the Tigera Operator. Added that command.
- The post used `calicoctl ipam show` without listing `calicoctl` as a prerequisite. Added `calicoctl` to the prerequisites for the IPAM verification step.
- The MTU guidance said to match the NIC's maximum frame size, which can be misleading when the usable underlay MTU differs from a NIC's maximum supported frame size. Updated the wording to match the network's usable frame size.
- The operator IP pool example did not name the pool. While older examples may omit it, the current Calico custom resources include `name: default-ipv4-ippool`; added the name for consistency with current manifests.

## Review Notes
The `encapsulation: None`, `natOutgoing: Enabled`, `nodeSelector: all()`, and `mtu` fields are valid in the operator Installation API. Disabling encapsulation requires working routed connectivity for pod CIDRs, typically through Calico BGP peering or another routing design.
