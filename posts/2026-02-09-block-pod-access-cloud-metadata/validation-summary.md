# Validation Summary: How to Block Kubernetes Pod Access to Cloud Provider Metadata Endpoints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- iptables
- CiliumNetworkPolicy and Hubble
- AWS EC2 Instance Metadata Service v2 (IMDSv2)
- Google Kubernetes Engine Workload Identity Federation and GKE metadata server
- Azure Kubernetes Service IMDS restriction and Microsoft Entra Workload ID

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Cilium deny policy documentation: https://docs.cilium.io/en/stable/security/policy/deny/
- AWS EC2 modify instance metadata options documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html
- AWS CLI create-launch-template-version reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template-version.html
- Amazon EKS IMDSv2 support announcement: https://aws.amazon.com/about-aws/whats-new/2020/08/amazon-eks-supports-ec2-instance-metadata-service-v2/
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE protecting cluster metadata documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/protecting-cluster-metadata
- AKS IMDS restriction documentation: https://learn.microsoft.com/en-us/azure/aks/imds-restriction
- AKS network policy best practices: https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices

## Issues Found
- The Kubernetes NetworkPolicy DNS namespace selector used a non-standard `name: kube-system` label. Changed it to the built-in `kubernetes.io/metadata.name: kube-system` namespace label and allowed TCP DNS in addition to UDP.
- The NetworkPolicy example implied all pod traffic was allowed by `podSelector: {}`. Clarified that this rule allows same-namespace pod traffic.
- The post did not mention that NetworkPolicy controls are not reliable for `hostNetwork: true` pods. Added a host-network caveat.
- The Calico GlobalNetworkPolicy selected pods with `has(block-metadata)` while the commands labeled namespaces. Changed the policy to use `namespaceSelector: block-metadata == "true"` and `selector: '!has(metadata-access)'`, and updated the exemption label command.
- The Cilium policy used `action: Deny`, which is Calico syntax, and placed the deny in an allow-style `egress` rule. Changed it to Cilium's `egressDeny` syntax with `toCIDRSet`.
- The AWS launch template command attempted to pass launch template data to `modify-launch-template`, but launch templates are changed by creating a new launch template version and then setting the default version. Updated the commands accordingly.
- The AWS IMDSv2 section overstated that most containers would be effectively blocked by the two-step token process. Rewrote the explanation to describe IMDSv2 as defense in depth and note that network controls or hop-limit behavior are still needed for pod-level blocking.
- The GKE section described legacy metadata concealment and included commands that did not enable it. Updated the section to use Workload Identity Federation for GKE and `--workload-metadata=GKE_METADATA`, which is the current recommended approach.
- The AKS section used an NSG rule for IMDS restriction. Replaced it with AKS's managed `--enable-imds-restriction` flow and kept workload identity configuration using Microsoft Entra Workload ID.
- The trusted-pod exception policy was created in `system` while the example labels targeted `kube-system`. Changed the policy and test namespace to `kube-system`.
- The conclusion and best practices used outdated or inconsistent provider names. Updated them to refer to Workload Identity Federation for GKE and Microsoft Entra Workload ID.

## Review Notes
The YAML examples parse successfully with PyYAML. `kubectl` was not installed in the review environment, so Kubernetes API server validation was not run locally. Some examples still use placeholder IDs, CIDRs, namespace names, and pod names that readers must adapt to their clusters.
