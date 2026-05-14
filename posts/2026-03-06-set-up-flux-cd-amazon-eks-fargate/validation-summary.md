# Validation Summary: How to Set Up Flux CD on Amazon EKS Fargate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS Fargate
- eksctl
- AWS CLI
- Kubernetes
- Flux CD
- CoreDNS
- Amazon EFS CSI
- Amazon CloudWatch Logs
- AWS for Fluent Bit
- Amazon VPC CNI security groups for pods

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS Fargate overview and limitations: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- Amazon EKS Fargate profiles: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- eksctl Fargate support: https://docs.aws.amazon.com/eks/latest/eksctl/fargate.html
- Amazon EKS CoreDNS management: https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- Amazon EKS Fargate pod CPU and memory configuration: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Amazon EFS CSI driver on Amazon EKS: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- Amazon EKS Fargate logging: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
- Amazon EKS Kubernetes network policies: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon EKS security groups for pods: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
- Amazon EKS SecurityGroupPolicy example: https://docs.aws.amazon.com/eks/latest/userguide/sg-pods-example-deployment.html
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux latest install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The EKS cluster creation example used Kubernetes `1.29`, which is no longer available for new EKS clusters after its extended support ended on March 23, 2026. Updated the example to `1.35`, which is in standard support on the validation date.
- The prerequisites named old minimum versions for eksctl and Flux CLI. Replaced them with current-version guidance because the post now targets current EKS and Flux support windows.
- The workload Fargate profile config duplicated the `flux-system-profile` already created in Step 2, which would fail if applied after the earlier command. Removed the duplicate Flux profile from the multi-profile example.
- The Flux resource example used requests lower than limits and an incorrect Fargate sizing comment. Updated requests and limits to match and corrected the Fargate allocation note based on EKS Fargate CPU/memory sizing and the 256 MB pod overhead.
- The EFS example used a dynamic provisioning StorageClass, but EKS Fargate supports EFS static provisioning and does not support dynamic persistent volume provisioning on Fargate nodes. Replaced it with a static EFS PersistentVolume and PersistentVolumeClaim example.
- The Fargate logging ConfigMap was placed in `flux-system`, but EKS Fargate logging requires an `aws-logging` ConfigMap in the dedicated `aws-observability` namespace with the `aws-observability: enabled` label. Updated the namespace and ConfigMap example to match AWS documentation.
- The post claimed Fargate supports Kubernetes NetworkPolicy enforcement. Amazon EKS documentation says network policies cannot be applied to Fargate nodes. Replaced the NetworkPolicy example with a `SecurityGroupPolicy` example and changed the section heading to network controls.

## Review Notes
The YAML snippets were parsed successfully after editing. Commands were reviewed against official documentation, but they were not executed against a live AWS account or EKS cluster.
