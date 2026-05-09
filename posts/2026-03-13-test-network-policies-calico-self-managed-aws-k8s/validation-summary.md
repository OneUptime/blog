# Validation Summary: How to Test Network Policies with Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Calico
- calicoctl
- AWS EC2
- AWS VPC networking
- BusyBox
- nginx

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico AWS reference: https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico installation/customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Amazon EKS alternate CNI plugin documentation: https://docs.aws.amazon.com/eks/latest/userguide/alternate-cni-plugins.html
- Amazon EKS network security best practices: https://docs.aws.amazon.com/eks/latest/best-practices/network-security.html
- Local BusyBox wget help output for BusyBox 1.36.1

## Issues Found
- The introduction overstated the EKS comparison by saying Calico operates only in policy-only mode on EKS. AWS documents alternate compatible CNI/plugin options and Calico policy support on EKS, so the wording was changed to focus on the self-managed cluster's direct control over Calico CNI/IPAM/BGP/encapsulation features.
- The AWS encapsulation explanation said IPIP is required unless VPC route tables are configured. Calico's AWS documentation specifically describes IPIP with outgoing NAT across VPC subnet boundaries, while Calico's overlay documentation also supports VXLAN as an overlay option. The wording was updated to describe encapsulation requirements more accurately.
- The post claimed the test validates cross-VPC scenarios, but the commands only exercise same-cluster and cross-AZ behavior. The claim was changed to cross-subnet and cross-AZ.
- The Calico manifest version was pinned to v3.27.0. The prerequisite was updated to v3.32.0 to match current Calico documentation at review time.
- The BusyBox wget commands used `--timeout=5`, which is not supported by the local BusyBox 1.36.1 wget help. They were changed to the supported `-T 5` option.
- The BusyBox test pods passed `sleep 3600` without `--command`. The commands were updated to `--command -- sleep 3600` to align with kubectl's documented command/args behavior.
- The cross-AZ `kubectl run --overrides` snippets omitted `apiVersion`, which kubectl documents as required for inline JSON overrides. The overrides were updated to include `apiVersion: v1`.
- The cross-AZ section created test pods but did not actually verify connectivity. A Pod IP lookup and BusyBox wget test were added so the section performs the validation it describes.

## Review Notes
The Kubernetes NetworkPolicy API version and policy structure are current and valid. I could not run `kubectl` locally because it is not installed in this workspace, so CLI validation was based on official Kubernetes documentation and available local BusyBox help.
