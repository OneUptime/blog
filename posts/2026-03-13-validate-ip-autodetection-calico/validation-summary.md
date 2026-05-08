# Validation Summary: How to Validate IP Autodetection in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico node IP autodetection
- calicoctl
- Calico operator Installation resource

## Sources Consulted
- Calico documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: Configuring calico/node IP autodetection methods, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl IPAM overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview

## Issues Found
- The original "Configuration" snippet used an `IPPool` resource. That resource is valid Calico configuration, but it configures pod address pools, encapsulation, and NAT behavior rather than node IP autodetection. I replaced it with the documented operator `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`.
- The original validation commands focused on IP pools and IPAM blocks. Those commands do not directly validate the node IP address selected by Calico autodetection. I changed them to inspect Calico `Node` resources and Kubernetes node addresses with `calicoctl get nodes -o yaml` and `kubectl get nodes -o wide`.
- The original verify command used `calicoctl ipam check`, which is not listed as an Open Source Calico IPAM subcommand in the current Calico Open Source documentation. I replaced it with commands that are applicable to validating autodetected node addresses.
- The original pod IP extraction used `awk '{print $8}'` against `kubectl get pods -A -o wide`; in the standard output, column 8 is the node name, not the pod IP. Since pod IPs do not validate Calico node autodetection directly, I removed that command from the verification step.
- The original architecture diagram showed IP pool block allocation and pod IP assignment, which is IPAM behavior rather than node IP autodetection. I updated it to show Kubernetes node address data flowing into the Calico `Node` resource used for routing.
- The conclusion contained a duplicated phrase: "in Calico in Calico." I corrected it to "in Calico."

## Review Notes
The corrected post validates the selected Calico node addresses by comparing Calico `Node` resource data with Kubernetes node address data. Future improvements could add separate examples for non-operator manifest installs using `IP_AUTODETECTION_METHOD`, but that was not added here to keep the post structure unchanged.
