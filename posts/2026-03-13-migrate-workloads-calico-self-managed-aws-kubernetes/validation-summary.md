# Validation Summary: Migrate Workloads to Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico Open Source
- Tigera operator
- calicoctl
- AWS EC2 networking
- CNI plugins

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes safely drain a node task: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Calico self-managed Kubernetes on AWS documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/aws
- Calico AWS public cloud configuration reference: https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico operator installation customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico flannel/Canal migration documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel
- Calico v3.27.0 operator and custom resource manifests: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml and https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The introduction described the AWS VPC CNI as the default starting point for self-managed AWS Kubernetes. I changed this to describe it as one possible existing CNI, alongside flannel, because self-managed clusters vary by installer and configuration.
- The post said Calico IP pools should align with the AWS VPC CIDR. I changed this to align with the Kubernetes pod CIDR and avoid overlap with VPC and service CIDRs, matching Calico guidance that IP pools are pod address ranges.
- The prerequisites implied the AWS VPC must provide CIDR space for Calico IP pools. I corrected this to require a planned Kubernetes pod CIDR that does not overlap with AWS VPC or service CIDRs.
- The migration flow implied generic node-by-node CNI replacement while the commands delete CNI resources cluster-wide. I clarified that CNI replacement is a cluster-wide maintenance task unless using a supported live migration mechanism such as Calico's flannel/Canal migration controller.
- The operator IP pool example used `encapsulation: VXLAN` for cross-AZ compatibility. I changed it to `VXLANCrossSubnet`, which is the Calico operator value used for cross-subnet VXLAN and is recommended for minimizing overlay overhead in multi-subnet environments.
- The BGP validation comment implied BGP peers should be established in all cases. I changed it to check configured BGP peers only when using BGP mode.
- The conclusion repeated the node-by-node migration claim. I changed it to reference careful CNI replacement planning and the official migration controller where applicable.

## Review Notes
The post is technically relevant and includes implementation commands and configuration. The migration steps remain a simplified high-level guide; for production migrations from flannel or Canal, the official Calico migration controller is the safer documented path.
