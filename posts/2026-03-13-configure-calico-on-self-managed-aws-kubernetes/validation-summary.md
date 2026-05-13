# Validation Summary: Configure Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico
- Tigera Operator
- Calico CNI and IPAM
- Calico BGP, VXLAN, and IP-in-IP networking
- AWS EC2, VPC routing, security groups, and instance metadata
- AWS CLI

## Sources Consulted
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm cluster creation guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Calico self-managed Kubernetes operator installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IP pools documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Kubernetes system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl installation guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- AWS CLI authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS VPC route table documentation: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html
- AWS EC2 modify-instance-attribute source/destination check reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html

## Issues Found
- The post stated that Calico could advertise pod routes via BGP directly to AWS VPC routing. AWS VPC route tables do not directly learn routes from Calico node BGP sessions; non-overlay designs need explicit AWS route table configuration or a supported external routing design. Updated the introduction and conclusion to describe Calico BGP accurately in AWS.
- The kubeadm example queried EC2 instance metadata without an IMDSv2 token. That can fail on instances where IMDSv2 is required. Updated the command to obtain and pass an IMDSv2 token when reading the local IPv4 address.
- The custom Tigera Operator resource omitted the `APIServer` resource included in the official Calico operator custom resources. Added the `APIServer` resource to match the documented operator install pattern for a complete Calico API installation.
- The verification step described `calicoctl node status` as checking BGP peering unconditionally, even though the tutorial's VXLAN overlay path may not rely on BGP peering. Updated the comment to say BGP peering is checked if BGP is enabled.
- The best-practices note tied source/destination check disabling specifically to BGP route advertisement. Updated it to the more accurate condition: non-overlay routing where nodes forward traffic on behalf of pods.

## Review Notes
- The Calico v3.27.0 manifest URLs and `calicoctl` download URL are plausible and consistent with the version used in the post, although Calico's latest documentation now references newer releases.
- The listed Calico security group ports for VXLAN, BGP, and Typha match Calico's documented network requirements.
- The AWS CLI security group ingress examples use valid flags for adding ingress from another security group.
