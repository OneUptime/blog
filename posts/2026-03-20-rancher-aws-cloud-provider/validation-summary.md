# Validation Summary: How to Configure AWS Cloud Provider in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- AWS cloud-controller-manager
- AWS EBS CSI Driver
- AWS IAM
- Helm
- AWS EC2, Elastic Load Balancing, and EBS

## Sources Consulted
- Rancher Manager docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/amazon
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 Linux agent configuration reference: https://docs.rke2.io/reference/linux_agent_config
- Kubernetes SIG AWS cloud provider prerequisites: https://cloud-provider-aws.sigs.k8s.io/prerequisites/
- Kubernetes SIG AWS cloud provider getting started: https://cloud-provider-aws.sigs.k8s.io/getting_started/
- AWS cloud-controller-manager Helm chart: https://github.com/kubernetes/cloud-provider-aws/tree/master/charts/aws-cloud-controller-manager
- AWS EBS CSI driver installation guide: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- AWS EBS CSI driver parameters reference: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EBS CSI driver dynamic provisioning example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/examples/kubernetes/dynamic-provisioning

## Issues Found
- The post treated AWS load balancers, node lifecycle, and EBS provisioning as one cloud-provider feature. I corrected the introduction and conclusion to distinguish the out-of-tree AWS cloud controller manager from the AWS EBS CSI driver, which is the supported path for EBS volumes on current Kubernetes.
- The original IAM policy was incomplete for current AWS cloud-controller-manager behavior. I replaced it with the current upstream permission set from the Kubernetes SIG AWS documentation.
- The tagging guidance only covered EC2 instances. I updated it to tag the nodes, subnet, and one security group with the cluster tag, which matches Rancher's current AWS cloud-provider guidance.
- The original `cloud-config.yaml` example mixed unsupported or unnecessary settings for this workflow. I removed the invalid `LoadBalancer` section and the incomplete `ServiceOverride` example and replaced the RKE2 configuration with the documented external cloud-provider settings.
- The RKE2 config originally set `cloud-provider-name: aws` without the external cloud-provider component arguments. I corrected the server and agent examples to use `cloud-provider=external` where required and to disable the in-tree controller on server nodes.
- The Rancher UI instructions said to paste a cloud-config file into the UI. I replaced that with a version-appropriate Rancher flow that applies the equivalent AWS cloud-provider settings through cluster edit.
- The original AWS CCM Helm install was too minimal for Rancher-managed RKE2 and omitted required Rancher-specific chart settings. I replaced it with a Helm values example based on Rancher's documented install flow, including tolerations, node selection, service-account credential usage, and the required RBAC adjustment.
- The EBS CSI installation used the `eks.amazonaws.com/role-arn` annotation as if it were a general Rancher/RKE2 pattern. I removed that EKS-specific example and replaced it with the generic upstream install flow plus the required `AmazonEBSCSIDriverPolicyV2` prerequisite.
- The verification section created a `LoadBalancer` Service without deploying matching pods. I added a backing `nginx` Deployment so the service test reflects a real workload.
- The original PVC example assumed a default `gp2` storage class. I replaced it with an explicit `ebs.csi.aws.com` StorageClass, PVC, and consumer Pod based on the upstream EBS CSI driver examples so the verification path actually exercises dynamic EBS provisioning.

## Review Notes
- The exact Rancher UI wording can vary slightly by Rancher release, but the corrected flow matches the current Rancher documentation reviewed on 2026-04-24.
- The review environment did not have local `aws`, `helm`, or `kubectl` binaries installed, so command syntax was validated against upstream documentation and chart sources instead of local CLI `--help` output.
