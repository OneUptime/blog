# Validation Summary: How to Troubleshoot Installation Issues with Calico on EKS

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Amazon EKS
- AWS VPC CNI
- Kubernetes NetworkPolicy
- kubectl
- AWS CLI
- calicoctl

## Sources Consulted
- Calico documentation: Installing on Amazon EKS: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Amazon EKS documentation: Network policies with Amazon VPC CNI: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon EKS documentation: Security group requirements: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
- AWS CLI documentation: describe-security-group-rules: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-group-rules.html
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post identified `calico-vxlan.yaml` as the EKS policy-only installation manifest. That manifest enables Calico VXLAN networking, not the current recommended EKS installation with AWS VPC CNI. Updated the installation example to use the Tigera operator, `kubernetesProvider: EKS`, `cni.type: AmazonVPC`, and `bgp: Disabled`, matching current Calico EKS documentation.
- The installation example omitted the AWS VPC CNI pod IP annotation requirement. Added the documented `aws-node` ClusterRole patch permission and `ANNOTATE_POD_IP=true` setting.
- The security group section implied that BGP 179 and VXLAN 4789 are required for standard EKS policy-only installs. Updated the text to clarify that BGP and VXLAN ports apply only when those full Calico networking modes are intentionally enabled.
- The FelixConfiguration example recommended `chainInsertMode: Append` as an EKS optimization. Calico documents `Insert` as the safe default, and appending can allow other iptables rules to bypass Calico policy. Removed that setting and kept the AWS VPC CNI interface prefix example.
- The best-practices list said to add required Calico ports before installation. Updated it to scope port changes to deployments that intentionally enable BGP, VXLAN, or Typha traffic between nodes.

## Review Notes
- The post uses Calico v3.32.0 URLs, which matched the current Calico Open Source documentation at review time.
- The validation commands create standalone test pods. That is appropriate for Calico policy validation, but users testing Amazon VPC CNI's native network policy feature should be aware that AWS documents different enforcement constraints for standalone pods.
