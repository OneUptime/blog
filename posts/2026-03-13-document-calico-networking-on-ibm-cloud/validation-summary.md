# Validation Summary: Document Calico Networking on IBM Cloud for Operators

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- IBM Cloud Kubernetes Service
- Calico network policy
- Kubernetes NetworkPolicy
- IBM Cloud VPC security groups
- IBM Cloud CLI
- calicoctl

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies - https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: Understanding Secure by Default Cluster VPC Networking - https://cloud.ibm.com/docs/containers?topic=containers-vpc-security-group-reference
- IBM Cloud Docs: Understanding VPC security groups in version 1.29 and earlier - https://cloud.ibm.com/docs/containers?topic=containers-vpc-security-group
- IBM Cloud Docs: Configuring VPC subnets - https://cloud.ibm.com/docs/containers?topic=containers-vpc-subnets
- IBM Cloud Docs: Debugging app deployments - https://cloud.ibm.com/docs/containers?topic=containers-debug_pods
- IBM Cloud Docs: Creating support cases - https://cloud.ibm.com/docs/account?topic=account-open-case
- Calico Documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post described IBM-managed resources as a fixed set of GlobalNetworkPolicies with specific order values such as `allow-ibm-ports` order 1000 and custom policies at 5000+. IBM documentation lists different default Calico host policies for classic clusters and does not document those order ranges as the IKS customization boundary. I changed the text to describe classic default Calico host policies, VPC managed security groups, and explicit policy-order documentation instead of invented safe ranges.
- The post treated VPC cluster dependencies as kubelet port 10250, VXLAN 4789, broad NodePort access, and SSH. IBM's VPC cluster documentation describes managed worker security groups, worker-to-worker rules, pod subnet rules, NodePort/load balancer rules, and IBM service ranges instead. I replaced the table with those documented dependencies.
- The post used `172.30.0.0/16` as the general pod CIDR for the VPC example. IBM documents `172.30.0.0/16` for classic clusters and `172.17.0.0/18` for the first VPC cluster by default unless customized. I updated the VPC example accordingly.
- The post implied additional IP pools are the normal way to expand pod CIDR on IKS. IBM documents custom pod and service subnets as cluster creation settings and warns against changing default Calico settings. I replaced the row with custom pod or service subnets at cluster creation.
- The upgrade runbook backed up only global policies and IP pools, but custom application policies might be namespaced Calico `NetworkPolicy` resources. I added `calicoctl get networkpolicies --all-namespaces` to the backup and validation steps.
- The escalation guide referred to Calico pods in `ibm-system`. IBM documentation shows Calico components in `calico-system` for current IKS versions. I changed the namespace.
- The escalation guide listed `ibmcloud case create`, but IBM's current support documentation directs users to create cases through the Support Center. I replaced the command with the Support Center instruction.

## Review Notes
The article is now accurate as an operational documentation guide, but operators should still capture cluster-specific details because IBM Cloud Kubernetes Service behavior differs between classic clusters, VPC clusters before 1.30, and VPC clusters using Secure by Default networking.
