# Validation Summary: Configure Calico Networking on IBM Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IBM Cloud Kubernetes Service
- IBM Cloud VPC
- IBM Cloud Classic Infrastructure
- Calico
- Kubernetes networking and network policies
- IBM Cloud CLI
- Helm

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies - https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: Architecture and dependencies of the service - https://cloud.ibm.com/docs/containers?topic=containers-service-arch
- IBM Cloud Docs: Understanding Secure by Default Cluster VPC Networking - https://cloud.ibm.com/docs/containers?topic=containers-vpc-security-group-reference
- IBM Cloud Docs: VPC security group rules CLI reference - https://cloud.ibm.com/docs/vpc?topic=vpc-security-groups-rules
- Calico Docs: Installing with Helm - https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Docs: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Docs: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Docs: System requirements and network ports - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

## Issues Found
- The post incorrectly implied that IKS users should customize managed Calico BGP and `IPPool` settings. IBM documentation states that modifying default Calico components, default `IPPool` resources, Calico nodes, daemon sets, or deployments is not supported in IKS. I changed the IKS section to focus on viewing managed configuration and applying supported Calico network policies.
- The IKS `IPPool` edit workflow would have directed readers to modify `default-ipv4-ippool`, which is not supported on IKS. I replaced those commands with supported `calicoctl` commands for nodes, namespace-scoped policies, global policies, and policy application.
- The Calico Helm install example omitted the current documented CRD installation step and did not pin the chart version. I updated it to create the `tigera-operator` namespace, install Calico CRDs through the Helm chart, and install the Tigera Operator with a current version.
- The self-managed VPC IP pool example used a `projectcalico.org/v3` `IPPool` as the initial operator-managed pool configuration. Current Calico operator documentation configures the default pool through the `operator.tigera.io/v1` `Installation` resource, so I replaced the snippet with an `Installation` resource using VXLAN, disabled BGP, outgoing NAT, and a valid block size.
- The classic infrastructure section stated that IBM Classic Infrastructure always requires IP-in-IP encapsulation. I changed this to a conditional statement for self-managed deployments where the VLAN underlay does not route pod CIDRs directly, and clarified that IBM manages Calico networking for IKS classic clusters.
- The conclusion repeated the unsupported idea that IKS users customize pre-existing Calico configuration and that classic infrastructure requires IP-in-IP. I updated it to match the corrected guidance.

## Review Notes
The IBM Cloud CLI and Calico CLI binaries were not installed in the local environment, so CLI syntax was validated against official IBM Cloud and Calico documentation rather than local `--help` output.
