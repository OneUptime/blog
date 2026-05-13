# Validation Summary: How to Configure IP Autodetection in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico Operator Installation resource
- Calico Node resources
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Configure IP autodetection - https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Open Source documentation: Node resource - https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The configuration example used an `IPPool`, which controls pod IP allocation and pool behavior, not Calico node IP autodetection. Replaced it with the Calico Operator `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`, which is an official autodetection method.
- The prerequisites did not specify the installation mode even though the corrected configuration uses the Calico Operator API. Updated the prerequisite to state that Calico is installed with the Tigera Operator.
- The initial inspection commands focused on IP pools and IPAM blocks rather than node autodetection state. Replaced them with commands that inspect Kubernetes node addresses, Calico Node resources, and the Calico Operator Installation resource.
- The verification command extracted the Kubernetes node column from pod output, not the node IP selected by Calico. Replaced it with `calicoctl get nodes -o yaml | grep -E 'ipv4Address|ipv6Address'` to inspect the addresses recorded in Calico Node resources.
- The architecture diagram described IPPool block allocation and pod IP assignment, which was unrelated to the post title and description. Updated it to show Kubernetes node internal IP selection flowing into Calico node autodetection and internode routing.

## Review Notes
The post now documents the Operator-based autodetection path. Manifest-based Calico installs use `IP_AUTODETECTION_METHOD` or `IP6_AUTODETECTION_METHOD` on the `calico-node` DaemonSet instead, so future revisions could mention that installation-mode difference if the article is expanded.
